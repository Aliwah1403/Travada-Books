import { supabase } from "@/lib/supabase"
import type { InboxItem } from "@/lib/queries/inbox"

// ─── Types ──────────────────────────────────────────────────────────────────

export type BillStatus = "unpaid" | "paid"
export type BillSource = "inbox" | "manual"

export type BillInboxRef = {
  id: string
  file_path: string
  file_name: string
  content_type: string | null
}

export type Bill = {
  id: string
  org_id: string
  inbox_item_id: string | null
  source: BillSource
  vendor_name: string
  bill_number: string | null
  amount: number
  currency: string
  issue_date: string | null
  due_date: string | null
  status: BillStatus
  paid_at: string | null
  transaction_id: string | null
  note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  inbox_item: BillInboxRef | null
}

// The inbox join comes back as an array or object depending on PostgREST
// version; normalized in normalizeBill below.
type RawBill = Omit<Bill, "amount" | "inbox_item"> & {
  amount: number | string
  inbox_item: BillInboxRef | BillInboxRef[] | null
}

const BILL_SELECT = `
  id, org_id, inbox_item_id, source, vendor_name, bill_number, amount, currency,
  issue_date, due_date, status, paid_at, transaction_id, note, created_by,
  created_at, updated_at,
  inbox_item:inbox_items(id, file_path, file_name, content_type)
`

function normalizeBill(raw: RawBill): Bill {
  return {
    ...raw,
    amount: Number(raw.amount),
    inbox_item: Array.isArray(raw.inbox_item) ? (raw.inbox_item[0] ?? null) : raw.inbox_item,
  }
}

export type BillInput = {
  vendor_name: string
  bill_number: string | null
  amount: number
  currency: string
  issue_date: string | null
  due_date: string | null
  note: string | null
}

// ─── Date helpers ───────────────────────────────────────────────────────────

/** Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the user's). */
export function todayISO(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Whole days from today to the given YYYY-MM-DD date (negative = past). */
export function daysFromToday(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number)
  const target = Date.UTC(y, m - 1, d)
  const [ty, tm, td] = todayISO().split("-").map(Number)
  return Math.round((target - Date.UTC(ty, tm - 1, td)) / 86_400_000)
}

/** Overdue is derived on read: unpaid and due before today. */
export function isBillOverdue(bill: Pick<Bill, "status" | "due_date">): boolean {
  return bill.status === "unpaid" && !!bill.due_date && daysFromToday(bill.due_date) < 0
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function listBills(orgId: string): Promise<Bill[]> {
  const { data, error } = await supabase
    .from("bills")
    .select(BILL_SELECT)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown as RawBill[]).map(normalizeBill)
}

export async function createBill(orgId: string, userId: string | null, input: BillInput): Promise<Bill> {
  const { data, error } = await supabase
    .from("bills")
    .insert({ ...input, org_id: orgId, created_by: userId, source: "manual" })
    .select(BILL_SELECT)
    .single()
  if (error) throw error
  return normalizeBill(data as unknown as RawBill)
}

export async function updateBill(id: string, input: BillInput): Promise<void> {
  const { error } = await supabase
    .from("bills")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

export async function setBillPaid(id: string, paid: boolean): Promise<void> {
  const { error } = await supabase
    .from("bills")
    .update({
      status: paid ? "paid" : "unpaid",
      paid_at: paid ? todayISO() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) throw error
}

/** Deletes only the bill row; a linked inbox item is left untouched. */
export async function deleteBill(id: string): Promise<void> {
  const { error } = await supabase.from("bills").delete().eq("id", id)
  if (error) throw error
}

/** Manual escape when AI missed or misclassified a document. */
export async function createBillFromInboxItem(item: InboxItem, userId: string | null): Promise<void> {
  if (item.amount == null || !item.currency) throw new Error("This document has no amount to bill.")
  const matched = !!item.transaction_id
  const { error } = await supabase.from("bills").insert({
    org_id: item.org_id,
    inbox_item_id: item.id,
    source: "inbox",
    vendor_name: item.display_name || item.file_name,
    bill_number: item.invoice_number,
    amount: item.amount,
    currency: item.currency,
    issue_date: item.date,
    due_date: null,
    // The sync trigger only fires on updates, so a matched item is set paid here.
    status: matched ? "paid" : "unpaid",
    paid_at: matched ? (item.transaction?.date ?? todayISO()) : null,
    transaction_id: item.transaction_id,
    created_by: userId,
  })
  if (error) {
    if (error.code === "23505") throw new Error("This document is already on your bills.")
    throw error
  }
}

export async function getBillForInboxItem(inboxItemId: string): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("bills")
    .select("id")
    .eq("inbox_item_id", inboxItemId)
    .maybeSingle()
  if (error) throw error
  return data
}
