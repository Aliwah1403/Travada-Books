import { eq } from "drizzle-orm"
import { inOrg } from "../db/client.js"
import { bills, inboxItems, transactions } from "../db/schema.js"
import { mapDbError, ServiceError } from "../lib/errors.js"
import type { ServiceCtx } from "./invoices.js"
import type { CreateBillInput, UpdateBillInput } from "./bill-schemas.js"

// Every bill write, in one place (API-WRITES-PLAN.md §6, domain 6a). The
// /v1/bills routes (the app) and the assistant's tools both call these.

type Ctx = Pick<ServiceCtx, "db" | "orgId">

export async function getBillRow(ctx: Ctx, id: string) {
  const [row] = await ctx.db.select().from(bills).where(inOrg(bills, ctx.orgId, eq(bills.id, id))).limit(1)
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Bill not found.")
  return row
}

export type BillRow = Awaited<ReturnType<typeof getBillRow>>

function columns(input: UpdateBillInput) {
  const out: Partial<typeof bills.$inferInsert> = {}
  if (input.vendor_name !== undefined) out.vendorName = input.vendor_name
  if (input.bill_number !== undefined) out.billNumber = input.bill_number || null
  if (input.amount !== undefined) out.amount = String(input.amount)
  if (input.currency !== undefined) out.currency = input.currency
  if (input.issue_date !== undefined) out.issueDate = input.issue_date
  if (input.due_date !== undefined) out.dueDate = input.due_date
  if (input.note !== undefined) out.note = input.note || null
  return out
}

const ALREADY_BILLED = {
  bills_inbox_item_id_key: { code: "CONFLICT" as const, message: "This document is already on your bills." },
}

export async function createBill(ctx: ServiceCtx, input: CreateBillInput) {
  try {
    const [row] = await ctx.db.transaction((tx) =>
      tx
        .insert(bills)
        .values({ ...columns(input), vendorName: input.vendor_name, amount: String(input.amount), currency: input.currency, orgId: ctx.orgId, createdBy: ctx.userId, source: "manual" })
        .returning(),
    )
    return { bill: row! }
  } catch (error) {
    throw mapDbError(error)
  }
}

export async function updateBill(ctx: ServiceCtx, id: string, input: UpdateBillInput) {
  const values = columns(input)
  if (Object.keys(values).length === 0) return { bill: await getBillRow(ctx, id) }
  let row: BillRow | undefined
  try {
    ;[row] = await ctx.db.transaction((tx) =>
      tx
        .update(bills)
        .set({ ...values, updatedAt: new Date().toISOString() })
        .where(inOrg(bills, ctx.orgId, eq(bills.id, id)))
        .returning(),
    )
  } catch (error) {
    throw mapDbError(error)
  }
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Bill not found.")
  return { bill: row }
}

/** Mark paid (on the given day, default today in the user's timezone) or unpaid again. */
export async function setBillPaid(ctx: ServiceCtx, id: string, paid: boolean, paidOn?: string) {
  const [row] = await ctx.db
    .update(bills)
    .set({ status: paid ? "paid" : "unpaid", paidAt: paid ? (paidOn ?? ctx.today) : null, updatedAt: new Date().toISOString() })
    .where(inOrg(bills, ctx.orgId, eq(bills.id, id)))
    .returning()
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Bill not found.")
  return { bill: row }
}

/** Deletes only the bill; a linked inbox document is left alone. */
export async function deleteBill(ctx: ServiceCtx, id: string) {
  const [row] = await ctx.db.delete(bills).where(inOrg(bills, ctx.orgId, eq(bills.id, id))).returning()
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Bill not found.")
  return { bill: row }
}

/**
 * Make a bill from an inbox document (when the AI missed it). A document
 * already matched to a transaction becomes a paid bill dated by that
 * transaction — the inbox→bill sync trigger only fires on updates.
 */
export async function createBillFromInboxItem(ctx: ServiceCtx, inboxItemId: string) {
  const [item] = await ctx.db
    .select({
      id: inboxItems.id,
      displayName: inboxItems.displayName,
      fileName: inboxItems.fileName,
      invoiceNumber: inboxItems.invoiceNumber,
      amount: inboxItems.amount,
      currency: inboxItems.currency,
      date: inboxItems.date,
      transactionId: inboxItems.transactionId,
      transactionDate: transactions.date,
    })
    .from(inboxItems)
    .leftJoin(transactions, eq(transactions.id, inboxItems.transactionId))
    .where(inOrg(inboxItems, ctx.orgId, eq(inboxItems.id, inboxItemId)))
    .limit(1)
  if (!item) throw new ServiceError(404, "NOT_FOUND", "Inbox document not found.")
  if (item.amount == null || !item.currency) {
    throw new ServiceError(422, "VALIDATION_FAILED", "This document has no amount to bill.")
  }
  const matched = !!item.transactionId
  try {
    const [row] = await ctx.db.transaction((tx) =>
      tx
        .insert(bills)
        .values({
          orgId: ctx.orgId,
          inboxItemId: item.id,
          source: "inbox",
          vendorName: item.displayName || item.fileName,
          billNumber: item.invoiceNumber,
          amount: item.amount!,
          currency: item.currency!,
          issueDate: item.date,
          dueDate: null,
          status: matched ? "paid" : "unpaid",
          paidAt: matched ? (item.transactionDate ?? ctx.today) : null,
          transactionId: item.transactionId,
          createdBy: ctx.userId,
        })
        .returning(),
    )
    return { bill: row! }
  } catch (error) {
    throw mapDbError(error, ALREADY_BILLED)
  }
}

export function billServices(ctx: ServiceCtx) {
  return {
    get: (id: string) => getBillRow(ctx, id),
    create: (input: CreateBillInput) => createBill(ctx, input),
    update: (id: string, input: UpdateBillInput) => updateBill(ctx, id, input),
    setPaid: (id: string, paid: boolean, paidOn?: string) => setBillPaid(ctx, id, paid, paidOn),
    remove: (id: string) => deleteBill(ctx, id),
    fromInbox: (inboxItemId: string) => createBillFromInboxItem(ctx, inboxItemId),
  }
}

export type BillServices = ReturnType<typeof billServices>
