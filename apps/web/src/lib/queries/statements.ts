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
}

const STATEMENT_SELECT = "id, created_at, org_id, customer_id, token, date_from, date_to, notes, snapshot_data, from_details, customer_details"

export async function createStatement(input: StatementInput): Promise<Statement> {
  const { data, error } = await supabase
    .from("statements")
    .insert(input)
    .select(STATEMENT_SELECT)
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
    .select(STATEMENT_SELECT)
    .eq("id", id)
    .eq("org_id", orgId)
    .single()

  if (error) throw error
  return data
}

export async function listCustomerStatements(customerId: string, orgId: string): Promise<Statement[]> {
  const { data, error } = await supabase
    .from("statements")
    .select(STATEMENT_SELECT)
    .eq("customer_id", customerId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}
