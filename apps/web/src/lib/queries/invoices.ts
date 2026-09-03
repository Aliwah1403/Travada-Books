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
  amount_paid: number
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
  exchange_rate: number | null
  converted_amount: number | null
  base_currency: string | null
  quotes: { quote_number: string | null } | null
  invoice_recurring: {
    id: string
    status: string
    frequency: string
    next_scheduled_at: string
    end_type: string
    end_after_count: number | null
    current_count: number
  } | null
  customers: { logo_url: string | null } | null
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
  exchange_rate?: number | null
  converted_amount?: number | null
  base_currency?: string | null
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

// Statuses that represent an invoice the customer has actually received.
// draft/scheduled have never been sent, canceled was withdrawn — none of them
// are money billed, so they stay out of every monetary figure below.
const ISSUED_STATUSES = new Set(["unpaid", "partially_paid", "overdue", "paid"])

// Statuses that still owe money.
const OWING_STATUSES = new Set(["unpaid", "partially_paid", "overdue"])

type SummarisableInvoice = {
  status: string
  total: number | null
  amount_paid: number | null
  converted_amount: number | null
}

// Reporting happens in the org's base currency, where `converted_amount` is the
// invoice total. There is no converted twin for `amount_paid`, so apportion it
// by the same ratio — matching how sync_payment_transaction() derives a
// payment's base_amount, so the two never disagree.
function inBaseCurrency(inv: SummarisableInvoice) {
  const total = inv.total ?? 0
  const invoiced = inv.converted_amount ?? total
  const rate = inv.converted_amount != null && total > 0 ? inv.converted_amount / total : 1
  const paid = (inv.amount_paid ?? 0) * rate
  return { invoiced, paid }
}

// Single source of truth for both the customers list and the customer detail
// page — they previously computed this separately and drifted apart.
export function summariseCustomerInvoices(
  invoices: SummarisableInvoice[]
): CustomerInvoiceSummary {
  let totalInvoiced = 0
  let totalPaid = 0
  let outstanding = 0

  for (const inv of invoices) {
    if (!ISSUED_STATUSES.has(inv.status)) continue
    const { invoiced, paid } = inBaseCurrency(inv)
    totalInvoiced += invoiced
    // Money actually received. A `partially_paid` invoice contributes its
    // part payment here rather than nothing, which is what the old
    // `status === "paid"` test did.
    totalPaid += paid
    // Remaining balance, not the full total — and `partially_paid` counts,
    // which the old unpaid/overdue test missed entirely, so a part-paid
    // customer showed zero outstanding.
    if (OWING_STATUSES.has(inv.status)) outstanding += invoiced - paid
  }

  // invoiceCount deliberately counts every invoice, including drafts, so it
  // reconciles with the invoice history table rendered beneath these figures.
  return { invoiceCount: invoices.length, totalInvoiced, totalPaid, outstanding }
}

const INVOICE_SELECT =
  "id, created_at, updated_at, org_id, user_id, customer_id, customer_name, token, invoice_number, status, issue_date, due_date, currency, line_items, subtotal, tax_amount, discount, total, amount_paid, customer_details, from_details, note, internal_note, payment_details, recurring, delivery_type, scheduled_at, send_template_id, sent_at, paid_at, viewed_at, quote_id, accept_payments, invoice_template, invoice_recurring_id, recurring_sequence, exchange_rate, converted_amount, base_currency, quotes(quote_number), invoice_recurring(id, status, frequency, next_scheduled_at, end_type, end_after_count, current_count), customers(logo_url)"

// Excludes owner identifiers and private fields for unauthenticated token lookups
const INVOICE_PUBLIC_SELECT =
  "id, token, invoice_number, status, issue_date, due_date, currency, line_items, subtotal, tax_amount, discount, total, amount_paid, customer_details, from_details, note, payment_details, customer_name, accept_payments"

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
  amount_paid: number
  customer_details: Record<string, unknown> | null
  from_details: Record<string, unknown> | null
  note: string | null
  payment_details: string | null
  customer_name: string
  accept_payments: boolean
}

// total is nullable (drafts may not have a computed total yet); amount_paid
// is always present (defaults to 0 in the DB). Never reads amount_paid off
// a stale client write — it is derived exclusively by the invoice_payments
// sync trigger.
export function invoiceBalance(inv: { total: number | null; amount_paid: number }): number {
  return (inv.total ?? 0) - (inv.amount_paid ?? 0)
}

export type InvoiceFilters = {
  search?: string
  statuses?: string[]
  dateFrom?: string
  dateTo?: string
  dueDateFrom?: string
  dueDateTo?: string
  amountMin?: number
  amountMax?: number
  customerIds?: string[]
  recurring?: boolean
}

const INVOICE_PAGE_SIZE = 50

export async function listInvoices(
  orgId: string,
  filters: InvoiceFilters = {},
  page = 0,
): Promise<{ data: Invoice[]; count: number }> {
  let query = supabase
    .from("invoices")
    .select(INVOICE_SELECT, { count: "exact" })
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(page * INVOICE_PAGE_SIZE, (page + 1) * INVOICE_PAGE_SIZE - 1)

  if (filters.search) query = query.ilike("customer_name", `%${filters.search}%`)
  if (filters.statuses?.length) query = query.in("status", filters.statuses)
  if (filters.dateFrom) query = query.gte("issue_date", filters.dateFrom)
  if (filters.dateTo) query = query.lte("issue_date", filters.dateTo)
  if (filters.dueDateFrom) query = query.gte("due_date", filters.dueDateFrom)
  if (filters.dueDateTo) query = query.lte("due_date", filters.dueDateTo)
  if (filters.amountMin != null) query = query.gte("total", filters.amountMin)
  if (filters.amountMax != null) query = query.lte("total", filters.amountMax)
  if (filters.customerIds?.length) query = query.in("customer_id", filters.customerIds)
  if (filters.recurring === true) query = query.neq("recurring", "one_time")
  if (filters.recurring === false) query = query.eq("recurring", "one_time")

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
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
      `Invoice number '${invoiceNumber}' is already used in your organization. Please provide a different invoice number or omit it to auto-generate one.`
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

export async function getNextInvoiceNumber(orgId: string): Promise<string> {
  const { data, error } = await supabase.rpc("next_invoice_number", { p_org_id: orgId })
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
    .select("customer_id, status, total, amount_paid, converted_amount, created_at")
    .eq("org_id", orgId)

  if (error) throw error

  // Group first, then summarise per customer through the shared helper so the
  // list page and the detail page cannot disagree.
  const grouped: Record<string, { rows: typeof data; lastInvoiceAt: string | null }> = {}
  for (const inv of data ?? []) {
    const id = inv.customer_id
    if (!id) continue
    if (!grouped[id]) grouped[id] = { rows: [], lastInvoiceAt: null }
    grouped[id].rows.push(inv)
    if (!grouped[id].lastInvoiceAt || inv.created_at > grouped[id].lastInvoiceAt!) {
      grouped[id].lastInvoiceAt = inv.created_at
    }
  }

  const map: CustomerSummaryMap = {}
  for (const [id, { rows, lastInvoiceAt }] of Object.entries(grouped)) {
    map[id] = { ...summariseCustomerInvoices(rows), lastInvoiceAt }
  }
  return map
}

export async function getCustomerInvoiceSummary(customerId: string, orgId: string): Promise<CustomerInvoiceSummary> {
  const { data, error } = await supabase
    .from("invoices")
    .select("status, total, amount_paid, converted_amount")
    .eq("customer_id", customerId)
    .eq("org_id", orgId)

  if (error) throw error

  return summariseCustomerInvoices(data ?? [])
}

// The bucket encodes the status + balance rules server-side. Passing a status
// list is no longer possible: once an invoice can be `partially_paid`, a card
// has to reason about both status and due date, and "how much" differs per
// bucket (outstanding balance for open/overdue, money received for paid).
export type InvoiceSummaryBucket = "open" | "overdue" | "paid"

export async function getInvoiceSummary(
  orgId: string,
  bucket: InvoiceSummaryBucket
): Promise<{ total_amount: number; invoice_count: number; currency: string }> {
  const { data, error } = await supabase
    .rpc("get_invoice_summary", { p_org_id: orgId, p_bucket: bucket })
    .single()
  if (error) throw error
  return data as { total_amount: number; invoice_count: number; currency: string }
}

export async function getInvoiceByToken(token: string): Promise<PublicInvoice> {
  const { data, error } = await supabase
    .rpc("get_invoice_by_token", { p_token: token })
    .select(INVOICE_PUBLIC_SELECT)
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
