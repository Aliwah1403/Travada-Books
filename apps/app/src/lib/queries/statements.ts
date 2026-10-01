import { supabase } from "@/lib/supabase"

export type StatementInvoiceRow = {
  id: string
  invoice_number: string | null
  status: string
  issue_date: string | null
  due_date: string | null
  total: number | null
  currency: string
  paid_at: string | null
  // Optional on purpose: statements are immutable JSONB snapshots, so rows
  // written before payment tracking existed genuinely have no amount_paid.
  // Readers must fall back (see statementPaidAmount) rather than assume 0,
  // which would make every historical statement look unpaid.
  amount_paid?: number | null
}

// Money received against a snapshotted invoice, tolerant of pre-ledger rows.
// Old snapshots recorded paid-ness only via status/paid_at and always implied
// the full total, which is exactly what the fallback reproduces.
export function statementPaidAmount(inv: StatementInvoiceRow): number {
  if (typeof inv.amount_paid === "number") return inv.amount_paid
  return inv.status === "paid" ? (inv.total ?? 0) : 0
}

// A real payment received against one of the customer's eligible invoices,
// snapshotted at statement-generation time — dated at its actual paid_at so
// the ledger can show a credit on the day it was really received instead of
// a single lump "payments received to date" line. Snake_case to match the
// shared ledger builder's StatementLedgerPayment (@travada-books/pdf) — the
// column is passed straight through with no field renaming.
export type StatementPaymentRow = {
  invoice_id: string | null
  invoice_number: string | null
  amount: number
  paid_at: string
  currency?: string | null
}

export type Statement = {
  id: string
  created_at: string
  org_id: string
  customer_id: string
  token: string
  date_from: string
  date_to: string
  notes: string | null
  snapshot_data: StatementInvoiceRow[]
  from_details: Record<string, unknown> | null
  customer_details: Record<string, unknown> | null
  include_pdf: boolean
  // Balance carried in from before date_from. 0 for every statement
  // generated before this existed (column default).
  opening_balance: number
  // Real payments within the statement period (see StatementPaymentRow).
  // NULL on any statement generated before this existed — that's the
  // "legacy statement" marker buildStatementLedger switches on to keep old
  // statements byte-for-byte unchanged; a new statement always writes an
  // array, possibly empty.
  payments_snapshot: StatementPaymentRow[] | null
  // Only populated on owner-facing reads (getStatement/createStatement/
  // listCustomerStatements) — never selected for the public token RPC, so
  // these stay undefined on anything a customer can reach.
  email_status?: "queued" | "sent" | "failed" | null
  email_error?: string | null
  email_status_at?: string | null
}

export type StatementInput = {
  org_id: string
  customer_id: string
  date_from: string
  date_to: string
  notes: string | null
  snapshot_data: StatementInvoiceRow[]
  from_details: Record<string, unknown> | null
  customer_details: Record<string, unknown> | null
  include_pdf?: boolean
  opening_balance: number
  payments_snapshot: StatementPaymentRow[]
}

// Never used for the public token RPC (get_statement_by_token) — it doesn't
// filter columns (SELECT * under the hood), so opening_balance and
// payments_snapshot are already included there once selected here too.
const STATEMENT_SELECT = "id, created_at, org_id, customer_id, token, date_from, date_to, notes, snapshot_data, from_details, customer_details, include_pdf, opening_balance, payments_snapshot"

const STATEMENT_DETAIL_SELECT = `${STATEMENT_SELECT}, email_status, email_error, email_status_at`

export async function createStatement(input: StatementInput): Promise<Statement> {
  const { data, error } = await supabase
    .from("statements")
    .insert(input)
    .select(STATEMENT_DETAIL_SELECT)
    .single()

  if (error) throw error
  return data
}

export async function getStatementByToken(token: string): Promise<Statement> {
  const { data, error } = await supabase
    .rpc("get_statement_by_token", { p_token: token })
    .select(STATEMENT_SELECT)
    .single()

  if (error) throw error
  return data
}

export async function getStatement(id: string, orgId: string): Promise<Statement> {
  const { data, error } = await supabase
    .from("statements")
    .select(STATEMENT_DETAIL_SELECT)
    .eq("id", id)
    .eq("org_id", orgId)
    .single()

  if (error) throw error
  return data
}

export async function listCustomerStatements(customerId: string, orgId: string): Promise<Statement[]> {
  const { data, error } = await supabase
    .from("statements")
    .select(STATEMENT_DETAIL_SELECT)
    .eq("customer_id", customerId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

// Statements has no FK from `documents`, so a generated PDF (Vault row +
// storage object) would otherwise be orphaned by a statement delete. Cleanup
// is best-effort and happens after the statement row is gone — matching
// deleteDocument()'s pattern in queries/vault.ts — since losing the parent
// statement is the meaningful failure, not a stray file.
export async function deleteStatement(id: string, orgId: string): Promise<void> {
  const { data: statement } = await supabase
    .from("statements")
    .select("file_path")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle()

  const { error } = await supabase
    .from("statements")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId)

  if (error) throw error

  const filePath = (statement as { file_path?: string | null } | null)?.file_path
  if (filePath) {
    await supabase.from("documents").delete().eq("file_path", filePath)
    await supabase.storage.from("vault").remove([filePath])
  }
}
