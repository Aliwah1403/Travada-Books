import { supabase } from "@/lib/supabase"
import type { LineItem } from "@/lib/queries/invoices"

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired"

export type Quote = {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  user_id: string
  customer_id: string
  customer_name: string
  token: string
  quote_number: string | null
  status: QuoteStatus
  issue_date: string | null
  valid_until: string | null
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
  sent_at: string | null
  resent_at: string | null
  accepted_at: string | null
  declined_at: string | null
  decline_reason: string | null
  viewed_at: string | null
  customers: { logo_url: string | null } | null
}

export type PublicQuote = Omit<Quote, "org_id" | "user_id" | "internal_note" | "customers">

export type QuoteInput = {
  org_id: string
  user_id: string
  customer_id: string
  customer_name: string
  quote_number: string
  currency: string
  issue_date: string | null
  valid_until: string | null
  line_items: LineItem[]
  subtotal: number
  tax_amount: number
  discount: number
  total: number
  note: string | null
  internal_note: string | null
  status?: QuoteStatus
  // Populated when sending immediately on create
  sent_at?: string
  from_details?: Record<string, unknown>
  customer_details?: Record<string, unknown>
}

const QUOTE_SELECT =
  "id, created_at, updated_at, org_id, user_id, customer_id, customer_name, token, quote_number, status, issue_date, valid_until, currency, line_items, subtotal, tax_amount, discount, total, customer_details, from_details, note, internal_note, sent_at, resent_at, accepted_at, declined_at, decline_reason, viewed_at, customers(logo_url)"

const PUBLIC_QUOTE_SELECT =
  "id, created_at, updated_at, customer_id, customer_name, token, quote_number, status, issue_date, valid_until, currency, line_items, subtotal, tax_amount, discount, total, customer_details, from_details, note, sent_at, resent_at, accepted_at, declined_at, decline_reason, viewed_at"

export async function listQuotes(orgId: string): Promise<Quote[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select(QUOTE_SELECT)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as Quote[]
}

export async function getQuote(id: string, orgId: string): Promise<Quote | null> {
  const { data, error } = await supabase
    .from("quotes")
    .select(QUOTE_SELECT)
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle()

  if (error) throw error
  return data as Quote | null
}

export async function getQuoteByToken(token: string): Promise<PublicQuote | null> {
  const { data, error } = await supabase
    .rpc("get_quote_by_token", { p_token: token })
    .select(PUBLIC_QUOTE_SELECT)
    .maybeSingle()

  if (error) throw error
  return data as PublicQuote | null
}

export async function getNextQuoteNumber(orgId: string, customerId: string): Promise<string> {
  const { data, error } = await supabase.rpc("next_quote_number", {
    p_org_id: orgId,
    p_customer_id: customerId,
  })

  if (error) throw error
  return data as string
}

export async function createQuote(input: QuoteInput): Promise<Quote> {
  const payload = {
    ...input,
    status: input.sent_at ? "sent" : "draft",
  }
  const { data, error } = await supabase
    .from("quotes")
    .insert(payload)
    .select(QUOTE_SELECT)
    .single()

  if (error) throw rethrowQuoteError(error)
  return data as Quote
}

export async function updateQuote(id: string, orgId: string, input: Partial<QuoteInput>): Promise<Quote> {
  const { data, error } = await supabase
    .from("quotes")
    .update(input)
    .eq("id", id)
    .eq("org_id", orgId)
    .select(QUOTE_SELECT)
    .single()

  if (error) throw rethrowQuoteError(error)
  return data as Quote
}

export async function deleteQuote(id: string, orgId: string): Promise<void> {
  const { error } = await supabase.from("quotes").delete().eq("id", id).eq("org_id", orgId)
  if (error) throw error
}

export async function sendQuote(
  id: string,
  orgId: string,
  fromDetails: Record<string, unknown>,
  customerDetails: Record<string, unknown>,
  previousSentAt?: string | null,
): Promise<Quote> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("quotes")
    .update({
      status: "sent",
      // Preserve the original sent_at; on resend, only update resent_at
      sent_at: previousSentAt ?? now,
      resent_at: previousSentAt ? now : null,
      from_details: fromDetails,
      customer_details: customerDetails,
    })
    .eq("id", id)
    .eq("org_id", orgId)
    .select(QUOTE_SELECT)
    .single()

  if (error) throw error
  return data as Quote
}

export async function duplicateQuote(quote: Quote, orgId: string, userId: string): Promise<Quote> {
  const nextNumber = await getNextQuoteNumber(orgId, quote.customer_id)

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      org_id: orgId,
      user_id: userId,
      customer_id: quote.customer_id,
      customer_name: quote.customer_name,
      quote_number: nextNumber,
      currency: quote.currency,
      issue_date: quote.issue_date,
      valid_until: quote.valid_until,
      line_items: quote.line_items,
      subtotal: quote.subtotal,
      tax_amount: quote.tax_amount,
      discount: quote.discount,
      total: quote.total,
      note: quote.note,
      internal_note: quote.internal_note,
    })
    .select(QUOTE_SELECT)
    .single()

  if (error) throw error
  return data as Quote
}

function rethrowQuoteError(error: { code?: string; message?: string }): Error {
  if (error.code === "23505") {
    throw new Error("This quote number has already been used for this customer.")
  }
  throw new Error(error.message ?? "An unexpected error occurred.")
}
