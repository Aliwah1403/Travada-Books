import { supabase } from "@/lib/supabase"

// Wrappers around the customer-portal RPCs defined in
// supabase/migrations/20260916000000_customer_portal.sql.
// See CUSTOMER-PORTAL-PLAN.md §5.2 for the contract.

export type CustomerPortalSummary = {
  customer_name: string
  org_name: string
  org_logo_url: string | null
  currency: string
  total_invoiced: number
  total_paid: number
  outstanding: number
  invoice_count: number
  overdue_count: number
  oldest_overdue_token: string | null
  oldest_overdue_due_date: string | null
  next_due_date: string | null
}

export type CustomerPortalInvoice = {
  invoice_number: string | null
  token: string
  status: string
  issue_date: string | null
  due_date: string | null
  currency: string
  total: number | null
  amount_paid: number
}

export type CustomerPortalQuote = {
  quote_number: string | null
  token: string
  status: string
  issue_date: string | null
  valid_until: string | null
  currency: string
  total: number | null
}

export type CustomerPortalStatement = {
  token: string
  date_from: string
  date_to: string
  created_at: string
}

export type CustomerPortalToggle = {
  portal_enabled: boolean
  portal_id: string | null
}

/** Single-row summary for `/p/:portalId`. Returns `null` for an unknown or
 * disabled portal — the RPC returns an empty set rather than erroring. */
export async function getCustomerPortal(portalId: string): Promise<CustomerPortalSummary | null> {
  const { data, error } = await supabase.rpc("get_customer_portal", { p_portal_id: portalId })

  if (error) throw error
  const rows = (data ?? []) as CustomerPortalSummary[]
  return rows[0] ?? null
}

export async function getCustomerPortalInvoices(portalId: string): Promise<CustomerPortalInvoice[]> {
  const { data, error } = await supabase.rpc("get_customer_portal_invoices", { p_portal_id: portalId })

  if (error) throw error
  return (data ?? []) as CustomerPortalInvoice[]
}

export async function getCustomerPortalQuotes(portalId: string): Promise<CustomerPortalQuote[]> {
  const { data, error } = await supabase.rpc("get_customer_portal_quotes", { p_portal_id: portalId })

  if (error) throw error
  return (data ?? []) as CustomerPortalQuote[]
}

export async function getCustomerPortalStatements(portalId: string): Promise<CustomerPortalStatement[]> {
  const { data, error } = await supabase.rpc("get_customer_portal_statements", { p_portal_id: portalId })

  if (error) throw error
  return (data ?? []) as CustomerPortalStatement[]
}

/** Owner-side: enable/disable the portal for a customer. Reuses the existing
 * portal_id when re-enabling; generates one the first time. */
export async function setCustomerPortal(customerId: string, enabled: boolean): Promise<CustomerPortalToggle> {
  const { data, error } = await supabase
    .rpc("set_customer_portal", { p_customer_id: customerId, p_enabled: enabled })
    .select("portal_enabled, portal_id")
    .single()

  if (error) throw error
  return data as CustomerPortalToggle
}

/** Owner-side: issue a new portal_id, invalidating the old link immediately. */
export async function regenerateCustomerPortalId(customerId: string): Promise<string> {
  const { data, error } = await supabase.rpc("regenerate_customer_portal_id", {
    p_customer_id: customerId,
  })

  if (error) throw error
  return data as string
}
