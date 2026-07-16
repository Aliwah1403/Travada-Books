import { supabase } from "@/lib/supabase"

// ─── Types ──────────────────────────────────────────────────────────────────

export type OverdueInvoices = {
  overdue_count: number
  overdue_total: number
  oldest_invoice_id: string | null
  oldest_invoice_number: string | null
  oldest_customer_name: string | null
  oldest_days_overdue: number | null
}

export type OutstandingInvoice = {
  id: string
  invoice_number: string
  customer_name: string | null
  amount: number
  due_date: string | null
  is_overdue: boolean
}

export type OutstandingInvoices = {
  unpaid_count: number
  unpaid_total: number
  overdue_count: number
  overdue_total: number
  top_invoices: OutstandingInvoice[]
}

export type BurnMonth = {
  month: string
  income: number
  expense: number
  net: number
}

export type BurnRate = {
  avg_monthly_net: number
  is_burning: boolean
  months: BurnMonth[]
}

export type Runway = {
  is_configured: boolean
  opening_balance: number | null
  cash_balance: number | null
  avg_monthly_burn: number | null
  months_remaining: number | null
}

export type TopCustomer = {
  customer_id: string
  customer_name: string | null
  revenue: number
  share: number
}

export type RevenueMonth = {
  month: string
  revenue: number
}

export type CashFlowMonth = {
  month: string
  income: number
  expense: number
  net: number
}

// ─── Overdue invoices ───────────────────────────────────────────────────────
// get_overdue_invoices always returns exactly one row (zeros/NULLs when
// there is nothing overdue), but PostgREST still wraps RETURNS TABLE output
// in an array — unwrap it here rather than downstream.

export async function getOverdueInvoices(orgId: string): Promise<OverdueInvoices | null> {
  const { data, error } = await supabase.rpc("get_overdue_invoices", { p_org_id: orgId })
  if (error) throw error
  return data?.[0] ?? null
}

// ─── Outstanding invoices ───────────────────────────────────────────────────
// Always one row. `top_invoices` is jsonb and already parsed into an array
// by PostgREST — never JSON.parse it here.

export async function getOutstandingInvoices(orgId: string): Promise<OutstandingInvoices | null> {
  const { data, error } = await supabase.rpc("get_outstanding_invoices", { p_org_id: orgId })
  if (error) throw error
  return data?.[0] ?? null
}

// ─── Burn rate ──────────────────────────────────────────────────────────────
// Always one row. Window is the last 3 FULL calendar months, excluding the
// current partial month.
// SIGN CONVENTION: avg_monthly_net is POSITIVE for a surplus, NEGATIVE when
// burning cash — is_burning === avg_monthly_net < 0.

export async function getBurnRate(orgId: string): Promise<BurnRate | null> {
  const { data, error } = await supabase.rpc("get_burn_rate", { p_org_id: orgId })
  if (error) throw error
  return data?.[0] ?? null
}

// ─── Runway ─────────────────────────────────────────────────────────────────
// Always one row. When the org has not set an opening balance, is_configured
// is false and every other field is null — render a "set your starting
// balance" empty state. months_remaining is null when the org is cash-flow
// positive (not burning), meaning infinite runway, NOT zero.

export async function getRunway(orgId: string): Promise<Runway | null> {
  const { data, error } = await supabase.rpc("get_runway", { p_org_id: orgId })
  if (error) throw error
  return data?.[0] ?? null
}

// ─── Top customer ───────────────────────────────────────────────────────────
// Genuinely zero rows when there is no income in the period — returns null.
// `share` is a FRACTION between 0 and 1, not a percentage.

export async function getTopCustomer(orgId: string, from: string, to: string): Promise<TopCustomer | null> {
  const { data, error } = await supabase.rpc("get_top_customer", { p_org_id: orgId, p_from: from, p_to: to })
  if (error) throw error
  return data?.[0] ?? null
}

// ─── Revenue summary (series) ───────────────────────────────────────────────
// Zero-filled contiguous month series — months with no revenue come back as
// 0, so there are never gaps. `revenueType` "net" subtracts each
// transaction's tax portion (converted to base currency); default is "gross".

export type RevenueType = "gross" | "net"

export async function getRevenueSummary(
  orgId: string,
  from: string,
  to: string,
  revenueType: RevenueType = "gross",
): Promise<RevenueMonth[]> {
  const { data, error } = await supabase.rpc("get_revenue_summary", {
    p_org_id: orgId,
    p_from: from,
    p_to: to,
    p_revenue_type: revenueType,
  })
  if (error) throw error
  return data ?? []
}

// ─── Currencies in use ──────────────────────────────────────────────────────
// Distinct transaction currencies other than the org's base currency — powers
// the toolbar's "view in" currency override (only offered when the org
// actually has foreign-currency transactions).

export async function getInUseCurrencies(orgId: string, baseCurrency: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("currency")
    .eq("org_id", orgId)
    .neq("currency", baseCurrency)
  if (error) throw error
  return [...new Set((data ?? []).map((row) => row.currency))].sort()
}

// ─── Cash flow (series) ─────────────────────────────────────────────────────
// Same zero-filled series. `expense` is a POSITIVE number; net = income - expense.

export async function getCashFlow(orgId: string, from: string, to: string): Promise<CashFlowMonth[]> {
  const { data, error } = await supabase.rpc("get_cash_flow", { p_org_id: orgId, p_from: from, p_to: to })
  if (error) throw error
  return data ?? []
}

// ─── Phase 2: spending, profitability, customers ───────────────────────────

export type CategoryExpense = {
  category_id: string | null
  category_name: string
  category_color: string | null
  total: number
  share: number
}

// Not zero-filled — only categories with expenses in the period appear.
// Ordered by total descending. `share` is a FRACTION between 0 and 1.

export async function getExpensesByCategory(orgId: string, from: string, to: string): Promise<CategoryExpense[]> {
  const { data, error } = await supabase.rpc("get_expenses_by_category", { p_org_id: orgId, p_from: from, p_to: to })
  if (error) throw error
  return data ?? []
}

export type RecurringExpenses = {
  total: number
  count: number
}

// Always one row. Current-month snapshot (like Burn Rate/Runway) — sum of
// transactions already flagged recurring=true, not a forward projection.

export async function getRecurringExpenses(orgId: string): Promise<RecurringExpenses | null> {
  const { data, error } = await supabase.rpc("get_recurring_expenses", { p_org_id: orgId })
  if (error) throw error
  return data?.[0] ?? null
}

export type InvoicePaymentStats = {
  avg_days_to_pay: number | null
  invoice_count: number
  prev_avg_days_to_pay: number | null
}

// Always one row. `avg_days_to_pay`/`prev_avg_days_to_pay` are null when there
// were no paid invoices in the respective window — render an empty state,
// not "0 days."

export async function getInvoicePaymentStats(orgId: string, from: string, to: string): Promise<InvoicePaymentStats | null> {
  const { data, error } = await supabase.rpc("get_invoice_payment_stats", { p_org_id: orgId, p_from: from, p_to: to })
  if (error) throw error
  return data?.[0] ?? null
}

export type ChurnedCustomer = {
  customer_id: string
  customer_name: string | null
}

export type CustomerChurn = {
  trailing_active_count: number
  churned_count: number
  churn_rate: number
  churned_customers: ChurnedCustomer[]
}

// Always one row. `churn_rate` is a FRACTION between 0 and 1, denominated
// against customers active in the TRAILING window (the period immediately
// before `from`, same length), not the current period — see
// DASHBOARD-PLAN.md §2.3 for the definition.

export async function getCustomerChurn(orgId: string, from: string, to: string): Promise<CustomerChurn | null> {
  const { data, error } = await supabase.rpc("get_customer_churn", { p_org_id: orgId, p_from: from, p_to: to })
  if (error) throw error
  return data?.[0] ?? null
}

export type TaxSummary = {
  tax_collected: number
  tax_paid: number
  net_tax: number
}

// Always one row. Positive net_tax means more VAT collected on sales than
// paid on purchases (a rough "you likely owe" figure) — this is NOT a filing
// calculation, just a directional summary.

export async function getTaxSummary(orgId: string, from: string, to: string): Promise<TaxSummary | null> {
  const { data, error } = await supabase.rpc("get_tax_summary", { p_org_id: orgId, p_from: from, p_to: to })
  if (error) throw error
  return data?.[0] ?? null
}

export type QuotePipeline = {
  open_count: number
  open_value: number
  acceptance_rate: number
  avg_days_to_decide: number | null
  decided_count: number
}

// Always one row. `open_count`/`open_value` are a LIVE snapshot (status =
// "sent", not period-bound — same pattern as get_outstanding_invoices).
// `acceptance_rate`/`avg_days_to_decide` are computed over quotes decided
// (accepted or declined) within the selected period; `avg_days_to_decide` is
// null when there were no accepted quotes in that window.

export async function getQuotePipeline(orgId: string, from: string, to: string): Promise<QuotePipeline | null> {
  const { data, error } = await supabase.rpc("get_quote_pipeline", { p_org_id: orgId, p_from: from, p_to: to })
  if (error) throw error
  return data?.[0] ?? null
}

export type QuoteFunnelMonth = {
  month: string
  sent: number
  accepted: number
  invoiced: number
}

// Zero-filled contiguous month series. COHORT-based, not calendar-event-based:
// each month buckets quotes by when they were SENT, then reports how that
// cohort ultimately resolved (regardless of when the decision/invoice
// happened) — "of quotes sent in March, how many became an invoice."

export async function getQuoteConversionFunnel(orgId: string, from: string, to: string): Promise<QuoteFunnelMonth[]> {
  const { data, error } = await supabase.rpc("get_quote_conversion_funnel", { p_org_id: orgId, p_from: from, p_to: to })
  if (error) throw error
  return data ?? []
}
