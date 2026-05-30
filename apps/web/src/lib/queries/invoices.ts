import { supabase } from "@/lib/supabase"

export type LineItem = {
  description: string
  quantity: number
  price: number
  tax_rate: number
}

export type Invoice = {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  user_id: string
  customer_id: string | null
  customer_name: string
  token: string
  invoice_number: string | null
  status: string
  issue_date: string | null
  due_date: string | null
  currency: string
  line_items: LineItem[]
  subtotal: number | null
  tax_amount: number | null
  discount: number | null
  total: number | null
  customer_details: Record<string, unknown> | null
  from_details: Record<string, unknown> | null
  note: string | null
  internal_note: string | null
  payment_details: string | null
  recurring: string
  delivery_type: string
  scheduled_at: string | null
  send_template_id: string | null
  sent_at: string | null
  paid_at: string | null
  viewed_at: string | null
  quote_id: string | null
  accept_payments: boolean
  invoice_template: string
  invoice_recurring_id: string | null
  recurring_sequence: number | null
  quotes: { quote_number: string | null } | null
}

export type InvoiceInput = {
  org_id: string
  user_id: string
  customer_id: string
  customer_name: string
  invoice_number: string
  status: string
  currency: string
  issue_date: string | null
  due_date: string | null
  recurring: string
  line_items: LineItem[]
  subtotal: number
  tax_amount: number
  discount: number
  total: number
  payment_details: string
  note: string
  delivery_type: string
  scheduled_at: string | null
  send_template_id: string | null
  sent_at?: string
  accept_payments?: boolean
  invoice_template?: string
  from_details?: Record<string, unknown> | null
  customer_details?: Record<string, unknown> | null
}

export type SendTemplate = {
  id: string
  name: string
  description: string | null
  subject: string
  body: string
  is_system: boolean
  is_default: boolean
}

export type CustomerInvoiceSummary = {
  invoiceCount: number
  totalInvoiced: number
  totalPaid: number
  outstanding: number
}

const INVOICE_SELECT =
  "id, created_at, updated_at, org_id, user_id, customer_id, customer_name, token, invoice_number, status, issue_date, due_date, currency, line_items, subtotal, tax_amount, discount, total, customer_details, from_details, note, internal_note, payment_details, recurring, delivery_type, scheduled_at, send_template_id, sent_at, paid_at, viewed_at, quote_id, accept_payments, invoice_template, invoice_recurring_id, recurring_sequence, quotes(quote_number)"

// Excludes owner identifiers and private fields for unauthenticated token lookups
const INVOICE_PUBLIC_SELECT =
  "id, token, invoice_number, status, issue_date, due_date, currency, line_items, subtotal, tax_amount, discount, total, customer_details, from_details, note, payment_details, customer_name, accept_payments"

export type PublicInvoice = {
  id: string
  token: string
  invoice_number: string | null
  status: string
  issue_date: string | null
  due_date: string | null
  currency: string
  line_items: LineItem[]
  subtotal: number | null
  tax_amount: number | null
  discount: number | null
  total: number | null
  customer_details: Record<string, unknown> | null
  from_details: Record<string, unknown> | null
  note: string | null
  payment_details: string | null
  customer_name: string
  accept_payments: boolean
}

export async function listInvoices(orgId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

function rethrowInvoiceError(error: { code?: string; message?: string }, invoiceNumber?: string | null): never {
  if (error.code === "23505" && error.message?.includes("invoice_number")) {
    throw new Error(
      `Invoice number '${invoiceNumber}' is already used for this customer. Please provide a different invoice number or omit it to auto-generate one.`
    )
  }
  throw error
}

export async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  const { data, error } = await supabase
    .from("invoices")
    .insert(input)
    .select(INVOICE_SELECT)
    .single()

  if (error) rethrowInvoiceError(error, input.invoice_number)
  return data
}

export async function updateInvoice(id: string, orgId: string, patch: Partial<InvoiceInput> & { internal_note?: string; status?: string; paid_at?: string | null; sent_at?: string | null; from_details?: Record<string, unknown> | null; customer_details?: Record<string, unknown> | null }): Promise<Invoice> {
  const { data, error } = await supabase
    .from("invoices")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", orgId)
    .select(INVOICE_SELECT)
    .single()

  if (error) rethrowInvoiceError(error, patch.invoice_number)
  return data
}

export async function deleteInvoice(id: string, orgId: string): Promise<void> {
  const { error } = await supabase.from("invoices").delete().eq("id", id).eq("org_id", orgId)
  if (error) throw error
}

export async function getNextInvoiceNumber(orgId: string, customerId: string): Promise<string> {
  const { data, error } = await supabase.rpc("next_invoice_number", { p_org_id: orgId, p_customer_id: customerId })
  if (error) throw error
  return data as string
}

export async function listCustomerInvoices(customerId: string, orgId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("customer_id", customerId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export type CustomerSummaryMap = Record<string, CustomerInvoiceSummary & { lastInvoiceAt: string | null }>

export async function listAllCustomerInvoiceSummaries(orgId: string): Promise<CustomerSummaryMap> {
  const { data, error } = await supabase
    .from("invoices")
    .select("customer_id, status, total, created_at")
    .eq("org_id", orgId)

  if (error) throw error

  const map: CustomerSummaryMap = {}
  for (const inv of data ?? []) {
    const id = inv.customer_id
    if (!id) continue
    if (!map[id]) map[id] = { invoiceCount: 0, totalInvoiced: 0, totalPaid: 0, outstanding: 0, lastInvoiceAt: null }
    const entry = map[id]
    entry.invoiceCount++
    entry.totalInvoiced += inv.total ?? 0
    if (inv.status === "paid") entry.totalPaid += inv.total ?? 0
    if (inv.status === "unpaid" || inv.status === "overdue") entry.outstanding += inv.total ?? 0
    if (!entry.lastInvoiceAt || inv.created_at > entry.lastInvoiceAt) entry.lastInvoiceAt = inv.created_at
  }
  return map
}

export async function getCustomerInvoiceSummary(customerId: string, orgId: string): Promise<CustomerInvoiceSummary> {
  const { data, error } = await supabase
    .from("invoices")
    .select("status, total")
    .eq("customer_id", customerId)
    .eq("org_id", orgId)

  if (error) throw error

  const invoices = data ?? []
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total ?? 0), 0)
  const totalPaid = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.total ?? 0), 0)
  const outstanding = invoices
    .filter((inv) => inv.status === "unpaid" || inv.status === "overdue")
    .reduce((sum, inv) => sum + (inv.total ?? 0), 0)

  return {
    invoiceCount: invoices.length,
    totalInvoiced,
    totalPaid,
    outstanding,
  }
}

export async function getInvoiceByToken(token: string): Promise<PublicInvoice> {
  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_PUBLIC_SELECT)
    .eq("token", token)
    .single()

  if (error) throw error
  return data as PublicInvoice
}

export async function listSendTemplates(): Promise<SendTemplate[]> {
  const { data, error } = await supabase
    .from("invoice_send_templates")
    .select("id, name, description, subject, body, is_system, is_default")
    .order("created_at", { ascending: true })

  if (error) throw error
  return data ?? []
}
