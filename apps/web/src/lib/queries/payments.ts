import { supabase } from "@/lib/supabase"

export type InvoicePayment = {
  id: string
  created_at: string
  org_id: string
  invoice_id: string
  recorded_by: string | null
  amount: number
  currency: string
  paid_at: string
  method: string
  reference: string | null
  note: string | null
  source: string
  transaction_id: string | null
  gateway_reference: string | null
}

// The client must never write `status` or `amount_paid` on invoices — those
// are derived exclusively by the invoice_payments_sync DB trigger. This
// input type intentionally has no such fields to make that impossible here.
export type InvoicePaymentInput = {
  org_id: string
  invoice_id: string
  recorded_by?: string | null
  amount: number
  currency: string
  paid_at?: string
  method: string
  reference?: string | null
  note?: string | null
  source?: string
  transaction_id?: string | null
  gateway_reference?: string | null
}

// Public shape returned by get_invoice_payments_by_token — intentionally
// excludes note, recorded_by, and reference (see PARTIAL-PAYMENTS-PLAN.md §4.4).
export type PublicInvoicePayment = {
  amount: number
  paid_at: string
  method: string
}

const PAYMENT_SELECT =
  "id, created_at, org_id, invoice_id, recorded_by, amount, currency, paid_at, method, reference, note, source, transaction_id, gateway_reference"

export async function listInvoicePayments(invoiceId: string): Promise<InvoicePayment[]> {
  const { data, error } = await supabase
    .from("invoice_payments")
    .select(PAYMENT_SELECT)
    .eq("invoice_id", invoiceId)
    .order("paid_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function createInvoicePayment(input: InvoicePaymentInput): Promise<InvoicePayment> {
  const { data, error } = await supabase
    .from("invoice_payments")
    .insert(input)
    .select(PAYMENT_SELECT)
    .single()

  if (error) throw error
  return data
}

export async function deleteInvoicePayment(id: string, orgId: string): Promise<void> {
  const { error } = await supabase
    .from("invoice_payments")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId)

  if (error) throw error
}

export async function getInvoicePaymentsByToken(token: string): Promise<PublicInvoicePayment[]> {
  const { data, error } = await supabase.rpc("get_invoice_payments_by_token", { p_token: token })
  if (error) throw error
  return (data ?? []) as PublicInvoicePayment[]
}
