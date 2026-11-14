import { count, eq, inArray, sql } from "drizzle-orm"
import { type DbOrTx, inOrg } from "../db/client.js"
import {
  customers,
  invoicePayments,
  invoices,
  transactionAttachments,
  transactionCategories,
  transactionCategoryRules,
  transactions,
} from "../db/schema.js"
import { mapDbError, pgConstraint, pgErrorCode, ServiceError } from "../lib/errors.js"
import { unusedPaths } from "./files.js"
import { followUp, getOrg, lookupRate, type ServiceCtx } from "./invoices.js"
import type {
  AttachmentInput,
  BulkTransactionUpdate,
  CreateTransactionInput,
  UpdateTransactionInput,
} from "./transaction-schemas.js"

// Every transaction, category and category-rule write, in one place
// (API-WRITES-PLAN.md §6, domain 5). The /v1/transactions routes (the app)
// and the assistant's tools both call these.
//
// Stays elsewhere: uploading attachment files to storage and their per-file
// AI processing (the app, then trigger-transaction-attachment), and the
// org-wide base-currency reconversion (settings, domain 7).

type Ctx = Pick<ServiceCtx, "db" | "orgId">

export async function getTransactionRow(ctx: Ctx, id: string) {
  const [row] = await ctx.db.select().from(transactions).where(inOrg(transactions, ctx.orgId, eq(transactions.id, id))).limit(1)
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Transaction not found.")
  return row
}

export type TransactionRow = Awaited<ReturnType<typeof getTransactionRow>>

// ─── Checks ─────────────────────────────────────────────────────────────────

/** A foreign key only proves the row exists; this proves it's in the caller's org. */
async function assertOwned(
  ctx: Ctx,
  table: typeof customers | typeof invoices | typeof transactionCategories,
  id: string | null | undefined,
  field: string,
  label: string,
) {
  if (!id) return
  const [row] = await ctx.db.select({ id: table.id }).from(table).where(inOrg(table, ctx.orgId, eq(table.id, id))).limit(1)
  if (!row) throw new ServiceError(422, "VALIDATION_FAILED", `${label} not found.`, field)
}

async function assertRefs(ctx: Ctx, input: { customer_id?: string | null; invoice_id?: string | null; category_id?: string | null }) {
  // In parallel: each is a round trip to the database.
  await Promise.all([
    assertOwned(ctx, customers, input.customer_id, "customer_id", "Customer"),
    assertOwned(ctx, invoices, input.invoice_id, "invoice_id", "Invoice"),
    assertOwned(ctx, transactionCategories, input.category_id, "category_id", "Category"),
  ])
}

/**
 * base_amount in the org's base currency — every dashboard figure sums it, so
 * a missing rate is an error, never a silent 1:1 (same rule as the app had).
 */
async function baseValues(ctx: Ctx, amount: number, currency: string) {
  const org = await getOrg(ctx)
  const base = org.baseCurrency
  const rate = await lookupRate(ctx, currency, base)
  if (rate == null) {
    throw new ServiceError(422, "VALIDATION_FAILED", `No exchange rate for ${currency} → ${base} yet.`, "currency")
  }
  return { baseAmount: String(Math.round(amount * rate * 10000) / 10000), baseCurrency: base }
}

/** snake_case fields → columns. Numbers go to numeric columns as strings. */
function columns(input: UpdateTransactionInput) {
  const out: Partial<typeof transactions.$inferInsert> = {}
  const set = <K extends keyof typeof out>(key: K, value: (typeof out)[K] | undefined) => {
    if (value !== undefined) out[key] = value
  }
  const money = (n: number | null | undefined) => (n === undefined ? undefined : n === null ? null : String(n))
  set("date", input.date)
  set("name", input.name)
  set("counterpartyName", input.counterparty_name === "" ? null : input.counterparty_name)
  set("customerId", input.customer_id)
  set("amount", money(input.amount) as string | undefined)
  set("currency", input.currency)
  set("type", input.type)
  set("status", input.status)
  set("paymentMode", input.payment_mode)
  set("categoryId", input.category_id)
  set("invoiceId", input.invoice_id)
  set("taxAmount", money(input.tax_amount))
  set("taxRate", money(input.tax_rate))
  set("taxType", input.tax_type)
  set("recurring", input.recurring)
  set("frequency", input.frequency)
  set("internal", input.internal)
  set("referenceNumber", input.reference_number === "" ? null : input.reference_number)
  set("note", input.note === "" ? null : input.note)
  return out
}

function attachmentRows(ctx: Ctx, transactionId: string, attachments: AttachmentInput[]) {
  return attachments.map((a) => ({
    transactionId,
    orgId: ctx.orgId,
    filePath: a.file_path,
    fileName: a.file_name,
    fileSize: a.file_size ?? null,
    contentType: a.content_type ?? null,
  }))
}

/** Attachments live under `<orgId>/…` in the vault bucket; refuse anything else. */
function assertOwnPaths(ctx: Ctx, attachments: AttachmentInput[]) {
  for (const a of attachments) {
    if (!a.file_path.startsWith(`${ctx.orgId}/`)) {
      throw new ServiceError(422, "VALIDATION_FAILED", "Attachment isn't in this organisation's storage.", "attachments")
    }
  }
}

// ─── Transactions ───────────────────────────────────────────────────────────

/**
 * Create a transaction (always `manual`). With an invoice and
 * mark_invoice_paid, the invoice's remaining balance is recorded as a payment
 * in the same database transaction — what create_transaction_and_mark_invoice_paid
 * did — and the invoice's status follows from its payments (trigger).
 * Enrichment is queued after commit.
 */
export async function createTransaction(ctx: ServiceCtx, input: CreateTransactionInput) {
  await assertRefs(ctx, input)
  assertOwnPaths(ctx, input.attachments)
  if (input.mark_invoice_paid && !input.invoice_id) {
    throw new ServiceError(422, "VALIDATION_FAILED", "Choose the invoice to mark as paid.", "invoice_id")
  }
  const base = await baseValues(ctx, input.amount, input.currency)
  const id = input.id ?? crypto.randomUUID()

  let row: TransactionRow
  try {
    row = await ctx.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(transactions)
        .values({
          ...columns(input),
          id,
          orgId: ctx.orgId,
          createdBy: ctx.userId,
          status: input.status ?? "completed",
          recurring: input.recurring ?? false,
          internal: input.internal ?? false,
          manual: true,
          ...base,
        } as typeof transactions.$inferInsert)
        .returning()
      if (input.attachments.length) await tx.insert(transactionAttachments).values(attachmentRows(ctx, id, input.attachments))
      if (input.invoice_id && input.mark_invoice_paid) await payInvoiceBalance(tx, ctx, id, input.invoice_id, input.date, input.payment_mode ?? null)
      return created!
    })
  } catch (error) {
    if (error instanceof ServiceError) throw error
    if (pgErrorCode(error) === "23505" && pgConstraint(error) === "transactions_pkey") {
      throw new ServiceError(409, "CONFLICT", "This transaction was already saved.")
    }
    throw mapDbError(error)
  }

  const enrichment = await followUp(() => ctx.effects.enrichTransactions(ctx.orgId, [id]))
  return { transaction: row, enrichment }
}

/** Records the invoice's outstanding balance as a payment from this transaction. */
async function payInvoiceBalance(
  tx: DbOrTx,
  ctx: ServiceCtx,
  transactionId: string,
  invoiceId: string,
  paidOn: string,
  paymentMode: string | null,
) {
  await tx.execute(sql`
    insert into ${invoicePayments} (org_id, invoice_id, recorded_by, amount, currency, paid_at, method, source, transaction_id)
    select i.org_id, i.id, ${ctx.userId}::uuid, i.total - i.amount_paid, i.currency, ${paidOn}::date,
           coalesce(${paymentMode}, 'other'), 'manual', ${transactionId}::uuid
    from ${invoices} i
    where i.id = ${invoiceId}::uuid and i.org_id = ${ctx.orgId}::uuid and i.total - i.amount_paid > 0
  `)
}

/** Update a transaction. Changing amount or currency recomputes base_amount. */
export async function updateTransaction(ctx: ServiceCtx, id: string, input: UpdateTransactionInput) {
  await assertRefs(ctx, input)
  const values = columns(input)
  if (input.amount !== undefined || input.currency !== undefined) {
    const current = await getTransactionRow(ctx, id)
    Object.assign(values, await baseValues(ctx, input.amount ?? Number(current.amount), input.currency ?? current.currency))
  }
  if (Object.keys(values).length === 0) return { transaction: await getTransactionRow(ctx, id) }

  let row: TransactionRow | undefined
  try {
    ;[row] = await ctx.db.transaction((tx) =>
      tx.update(transactions).set(values).where(inOrg(transactions, ctx.orgId, eq(transactions.id, id))).returning(),
    )
  } catch (error) {
    throw mapDbError(error)
  }
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Transaction not found.")
  return { transaction: row }
}

/**
 * Delete transactions (their attachment rows cascade). Attachment files are
 * removed after commit only if nothing else uses them — a receipt matched
 * from the inbox, or one also kept in the Vault, stays.
 */
export async function deleteTransactions(ctx: ServiceCtx, ids: string[]) {
  const { deleted, removable } = await ctx.db.transaction(async (tx) => {
    const files = await tx
      .select({ path: transactionAttachments.filePath })
      .from(transactionAttachments)
      .where(inOrg(transactionAttachments, ctx.orgId, inArray(transactionAttachments.transactionId, ids)))
    const deleted = await tx
      .delete(transactions)
      .where(inOrg(transactions, ctx.orgId, inArray(transactions.id, ids)))
      .returning({ id: transactions.id })
    return { deleted, removable: await unusedPaths(tx, ctx.orgId, files.map((f) => f.path)) }
  })
  if (deleted.length === 0) throw new ServiceError(404, "NOT_FOUND", ids.length === 1 ? "Transaction not found." : "None of those transactions were found.")
  if (removable.length) await followUp(() => ctx.effects.removeVaultFiles(removable))
  return { deleted: deleted.length }
}

/** Change category, status, payment mode or recurrence on many transactions at once. */
export async function bulkUpdateTransactions(ctx: ServiceCtx, ids: string[], update: BulkTransactionUpdate) {
  await assertRefs(ctx, { category_id: update.category_id })
  const values = columns(update)
  if (Object.keys(values).length === 0) throw new ServiceError(422, "VALIDATION_FAILED", "Nothing to update.")
  const rows = await ctx.db
    .update(transactions)
    .set(values)
    .where(inOrg(transactions, ctx.orgId, inArray(transactions.id, ids)))
    .returning({ id: transactions.id })
  if (rows.length === 0) throw new ServiceError(404, "NOT_FOUND", "None of those transactions were found.")
  return { updated: rows.length, ids: rows.map((r) => r.id) }
}

// ─── Attachments ────────────────────────────────────────────────────────────

/** Record files the app already uploaded to the vault under this transaction. */
export async function addAttachments(ctx: ServiceCtx, transactionId: string, attachments: AttachmentInput[]) {
  await getTransactionRow(ctx, transactionId)
  assertOwnPaths(ctx, attachments)
  const rows = await ctx.db.insert(transactionAttachments).values(attachmentRows(ctx, transactionId, attachments)).returning()
  return { attachments: rows }
}

/** Remove an attachment. Its file goes too unless something else (inbox, Vault) still uses it. */
export async function deleteAttachment(ctx: ServiceCtx, attachmentId: string) {
  const { row, removable } = await ctx.db.transaction(async (tx) => {
    const [row] = await tx
      .delete(transactionAttachments)
      .where(inOrg(transactionAttachments, ctx.orgId, eq(transactionAttachments.id, attachmentId)))
      .returning()
    return { row, removable: row ? await unusedPaths(tx, ctx.orgId, [row.filePath]) : [] }
  })
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Attachment not found.")
  if (removable.length) await followUp(() => ctx.effects.removeVaultFiles(removable))
  return { attachment: row }
}

// ─── Categories ─────────────────────────────────────────────────────────────

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

const CATEGORY_TAKEN = {
  transaction_categories_org_id_slug_key: { code: "CONFLICT" as const, message: "A category with this name already exists.", field: "name" },
}

export async function createCategory(ctx: ServiceCtx, input: { name: string; color?: string | null }) {
  try {
    // Own savepoint: a refused duplicate mustn't break a caller's transaction.
    const [row] = await ctx.db.transaction((tx) =>
      tx
        .insert(transactionCategories)
        .values({ orgId: ctx.orgId, name: input.name, slug: slugify(input.name), color: input.color ?? null })
        .returning(),
    )
    return { category: row! }
  } catch (error) {
    throw mapDbError(error, CATEGORY_TAKEN)
  }
}

/** Rename or recolour. The slug stays, so rules and filters keep pointing at it. */
export async function updateCategory(ctx: ServiceCtx, id: string, input: { name?: string; color?: string | null }) {
  const values = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))
  let row: typeof transactionCategories.$inferSelect | undefined
  try {
    ;[row] = await ctx.db.transaction((tx) =>
      tx
        .update(transactionCategories)
        .set(values)
        .where(inOrg(transactionCategories, ctx.orgId, eq(transactionCategories.id, id)))
        .returning(),
    )
  } catch (error) {
    throw mapDbError(error, CATEGORY_TAKEN)
  }
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Category not found.")
  return { category: row }
}

/** Only unused, non-system categories can go. */
export async function deleteCategory(ctx: ServiceCtx, id: string) {
  const [category] = await ctx.db
    .select()
    .from(transactionCategories)
    .where(inOrg(transactionCategories, ctx.orgId, eq(transactionCategories.id, id)))
    .limit(1)
  if (!category) throw new ServiceError(404, "NOT_FOUND", "Category not found.")
  if (category.system) throw new ServiceError(403, "FORBIDDEN", "Built-in categories can't be deleted.")

  const [{ used } = { used: 0 }] = await ctx.db
    .select({ used: count() })
    .from(transactions)
    .where(inOrg(transactions, ctx.orgId, eq(transactions.categoryId, id)))
  if (used > 0) {
    throw new ServiceError(409, "CONFLICT", `This category is used by ${used} transaction${used === 1 ? "" : "s"} and cannot be deleted.`)
  }
  try {
    await ctx.db.transaction((tx) => tx.delete(transactionCategories).where(inOrg(transactionCategories, ctx.orgId, eq(transactionCategories.id, id))))
  } catch (error) {
    if (pgErrorCode(error) === "23503") {
      throw new ServiceError(409, "CONFLICT", "This category is still used elsewhere (a rule or a bill) and cannot be deleted.")
    }
    throw mapDbError(error)
  }
  return { category }
}

// ─── Category rules ─────────────────────────────────────────────────────────

/**
 * "Always file X under Y". New and edited transactions pick it up through the
 * apply_category_rule_on_write trigger; existing uncategorised ones are filed
 * now (apply_category_rule). Returns how many that was.
 */
export async function createCategoryRule(ctx: ServiceCtx, input: { pattern: string; category_id: string }) {
  await assertRefs(ctx, { category_id: input.category_id })
  try {
    return await ctx.db.transaction(async (tx) => {
      const [rule] = await tx
        .insert(transactionCategoryRules)
        .values({ orgId: ctx.orgId, pattern: input.pattern, categoryId: input.category_id, createdBy: ctx.userId })
        .returning()
      const rows = await tx.execute<{ n: number }>(sql`select public.apply_category_rule(${rule!.id}::uuid) as n`)
      return { rule: rule!, applied: Number(rows[0]?.n ?? 0) }
    })
  } catch (error) {
    throw mapDbError(error, {
      transaction_category_rules_org_pattern_key: { code: "CONFLICT", message: "A rule for that text already exists.", field: "pattern" },
    })
  }
}

export async function deleteCategoryRule(ctx: ServiceCtx, id: string) {
  const [row] = await ctx.db
    .delete(transactionCategoryRules)
    .where(inOrg(transactionCategoryRules, ctx.orgId, eq(transactionCategoryRules.id, id)))
    .returning()
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Rule not found.")
  return { rule: row }
}

export function transactionServices(ctx: ServiceCtx) {
  return {
    get: (id: string) => getTransactionRow(ctx, id),
    create: (input: CreateTransactionInput) => createTransaction(ctx, input),
    update: (id: string, input: UpdateTransactionInput) => updateTransaction(ctx, id, input),
    remove: (ids: string[]) => deleteTransactions(ctx, ids),
    bulkUpdate: (ids: string[], update: BulkTransactionUpdate) => bulkUpdateTransactions(ctx, ids, update),
    createCategory: (input: { name: string; color?: string | null }) => createCategory(ctx, input),
    createRule: (input: { pattern: string; category_id: string }) => createCategoryRule(ctx, input),
  }
}

export type TransactionServices = ReturnType<typeof transactionServices>
