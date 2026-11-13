import { buildCustomerDetailsSnapshot, buildFromDetailsSnapshot, buildStatementSnapshot } from "@travada-books/core"
import { and, eq, inArray } from "drizzle-orm"
import { inOrg } from "../db/client.js"
import { documents, invoicePayments, invoices, statements } from "../db/schema.js"
import { mapDbError, ServiceError } from "../lib/errors.js"
import { followUp, getCustomer, getOrg, type ServiceCtx } from "./invoices.js"
import type { CreateStatementInput } from "./statement-schemas.js"

// Every statement write, in one place (API-WRITES-PLAN.md §6, domain 3). The
// /v1/statements routes (the app) and the assistant's tools both call these.
//
// A statement is an immutable snapshot, so there's no update: it's created
// (with what goes on it worked out here, by the shared core rule), emailed,
// and deleted.

export async function getStatementRow(ctx: Pick<ServiceCtx, "db" | "orgId">, id: string) {
  const [row] = await ctx.db.select().from(statements).where(inOrg(statements, ctx.orgId, eq(statements.id, id))).limit(1)
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Statement not found.")
  return row
}

export type StatementRow = Awaited<ReturnType<typeof getStatementRow>>

/** Postgres text timestamps ("2026-11-11 18:06:37+00") → ISO, which every browser parses. */
const iso = (value: string) => new Date(value).toISOString()

/** The customer's invoices and every payment recorded against them. */
async function customerLedger(ctx: ServiceCtx, customerId: string) {
  const invoiceRows = await ctx.db
    .select({
      id: invoices.id,
      invoice_number: invoices.invoiceNumber,
      status: invoices.status,
      issue_date: invoices.issueDate,
      due_date: invoices.dueDate,
      total: invoices.total,
      currency: invoices.currency,
      paid_at: invoices.paidAt,
      amount_paid: invoices.amountPaid,
      created_at: invoices.createdAt,
    })
    .from(invoices)
    .where(inOrg(invoices, ctx.orgId, eq(invoices.customerId, customerId)))

  const ids = invoiceRows.map((r) => r.id)
  const paymentRows = ids.length
    ? await ctx.db
        .select({
          invoice_id: invoicePayments.invoiceId,
          amount: invoicePayments.amount,
          paid_at: invoicePayments.paidAt,
          currency: invoicePayments.currency,
        })
        .from(invoicePayments)
        .where(inOrg(invoicePayments, ctx.orgId, inArray(invoicePayments.invoiceId, ids)))
    : []

  return {
    invoices: invoiceRows.map((r) => ({
      ...r,
      total: r.total == null ? null : Number(r.total),
      amount_paid: Number(r.amount_paid),
      paid_at: r.paid_at == null ? null : iso(r.paid_at),
      created_at: iso(r.created_at),
    })),
    payments: paymentRows.map((p) => ({ ...p, amount: Number(p.amount), paid_at: iso(p.paid_at) })),
  }
}

export async function createStatement(ctx: ServiceCtx, input: CreateStatementInput) {
  const customer = await getCustomer(ctx, input.customer_id)
  const org = await getOrg(ctx)
  const ledger = await customerLedger(ctx, customer.id)
  const snapshot = buildStatementSnapshot({
    ...ledger,
    dateFrom: input.date_from,
    dateTo: input.date_to,
    timeZone: ctx.timezone,
  })

  let row: StatementRow
  try {
    ;[row] = (await ctx.db
      .insert(statements)
      .values({
        orgId: ctx.orgId,
        customerId: customer.id,
        dateFrom: input.date_from,
        dateTo: input.date_to,
        notes: input.notes || null,
        includePdf: input.include_pdf,
        snapshotData: snapshot.snapshot_data,
        paymentsSnapshot: snapshot.payments_snapshot,
        openingBalance: String(snapshot.opening_balance),
        // Statements have always used the org's own logo (not the invoice template's).
        fromDetails: buildFromDetailsSnapshot(
          {
            name: org.name,
            address_line1: org.addressLine1,
            address_line2: org.addressLine2,
            city: org.city,
            zip: org.zip,
            country_code: org.countryCode,
            phone: org.phone,
            email: org.email,
            tax_id: org.taxId,
            tax_id_label: org.taxIdLabel,
          },
          org.logoUrl ?? null,
        ),
        customerDetails: buildCustomerDetailsSnapshot({
          name: customer.name,
          email: customer.email,
          billing_email: customer.billingEmail,
          billing_cc: customer.billingCc,
          phone: customer.phone,
          address_line1: customer.addressLine1,
          address_line2: customer.addressLine2,
          city: customer.city,
          zip: customer.zip,
          country: customer.country,
        }),
      })
      .returning()) as [StatementRow]
  } catch (error) {
    throw mapDbError(error)
  }

  const email = input.send ? await followUp(() => ctx.effects.sendStatementEmail(row.id)) : undefined
  return { statement: row, ...(email ? { email } : {}) }
}

/** Email a statement to the customer (or retry a failed send). */
export async function sendStatement(ctx: ServiceCtx, id: string) {
  const statement = await getStatementRow(ctx, id)
  const customer = (statement.customerDetails ?? {}) as { billing_email?: string | null; email?: string | null }
  if (!customer.billing_email && !customer.email) {
    throw new ServiceError(
      422,
      "VALIDATION_FAILED",
      "This customer had no email address when the statement was made. Add one and generate a new statement.",
    )
  }
  // The user's direct request: surface a failure rather than swallow it.
  try {
    return await ctx.effects.sendStatementEmail(id)
  } catch (error) {
    throw new ServiceError(502, "INTERNAL", "The email couldn't be sent. Please try again.", undefined, error)
  }
}

/**
 * Delete a statement and its generated PDF. `documents` has no FK to
 * statements, so the Vault row goes in the same transaction; the stored file
 * is removed after commit, best-effort (a stray file is harmless, a statement
 * that won't delete isn't).
 */
export async function deleteStatement(ctx: ServiceCtx, id: string) {
  const statement = await getStatementRow(ctx, id)
  await ctx.db.transaction(async (tx) => {
    await tx.delete(statements).where(inOrg(statements, ctx.orgId, eq(statements.id, id)))
    if (statement.filePath) {
      await tx.delete(documents).where(and(eq(documents.orgId, ctx.orgId), eq(documents.filePath, statement.filePath)))
    }
  })
  if (statement.filePath) {
    const path = statement.filePath
    await followUp(() => ctx.effects.removeVaultFiles([path]))
  }
  return { statement }
}

export function statementServices(ctx: ServiceCtx) {
  return {
    get: (id: string) => getStatementRow(ctx, id),
    create: (input: CreateStatementInput) => createStatement(ctx, input),
    send: (id: string) => sendStatement(ctx, id),
    remove: (id: string) => deleteStatement(ctx, id),
  }
}

export type StatementServices = ReturnType<typeof statementServices>
