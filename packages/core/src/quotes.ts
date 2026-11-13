// Quote rules shared by the app, the API and the worker.

// Single source of truth for when a quote can be edited — used by the list
// menu, the detail page and the edit route guard. Drafts are still being
// written; declined quotes can be revised and resent (saving resets them to
// draft). Sent quotes are locked while the customer decides, and accepted /
// expired quotes are final.
export function isQuoteEditable(status: string): boolean {
  return status === "draft" || status === "declined"
}

/** Today as "YYYY-MM-DD" in the runtime's local timezone. */
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * `valid_until` is a Postgres `date` ("YYYY-MM-DD"). Comparing it via
 * `new Date(validUntil) < new Date()` treats it as UTC midnight, so the quote
 * reads as expired for the entire last valid day in any timezone behind UTC.
 * Compare calendar-date strings instead so the quote stays valid through the
 * whole of its valid-until day (matches the worker's expiry logic).
 *
 * `today` defaults to the runtime's local date (right for the browser). On the
 * server, pass today's date in the organisation's or user's timezone.
 */
export function isPastValidUntil(validUntil: string | null | undefined, today: string = localDateString()): boolean {
  if (!validUntil) return false
  return validUntil < today
}

/** Statuses a quote can be in (quotes_status_check). */
export const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined", "expired"] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

/**
 * When a quote can be issued to the customer: a draft, or a declined quote
 * being resent. (Same set as isQuoteEditable today, kept separate because the
 * two questions could diverge.)
 */
export function isQuoteSendable(status: string): boolean {
  return status === "draft" || status === "declined"
}

/** Calendar-date arithmetic on "YYYY-MM-DD" strings, timezone-free. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split("T")[0]!
}

/** The quote columns an invoice is made from. */
export type QuoteForConversion = {
  customer_id: string
  customer_name: string | null
  currency: string | null
  line_items: unknown
  custom_fields: unknown
  subtotal: number | string | null
  tax_amount: number | string | null
  discount: number | string | null
  vat_rate: number | string | null
  discount_percent: number | string | null
  total: number | string | null
  from_details: unknown
  customer_details: unknown
  note: string | null
}

/** The organisation's invoice defaults that apply to a converted quote. */
export type InvoiceDefaultsForConversion = {
  payment_terms: number | null
  default_note: string | null
  default_payment_details: string | null
  invoice_template: string | null
}

/**
 * The draft invoice an accepted quote becomes: same customer, lines and
 * totals, the quote's snapshots, issued today and due after the template's
 * payment terms. The quote's note wins over the template's default note.
 *
 * Kept in step with supabase/functions/accept-quote (the customer's own
 * "Accept" on /q/:token), which can't import this package.
 */
export function invoiceFromQuote(quote: QuoteForConversion, defaults: InvoiceDefaultsForConversion | null, issueDate: string) {
  return {
    customer_id: quote.customer_id,
    customer_name: quote.customer_name,
    status: "draft" as const,
    issue_date: issueDate,
    due_date: defaults?.payment_terms ? addDays(issueDate, defaults.payment_terms) : null,
    currency: quote.currency ?? "KES",
    line_items: quote.line_items,
    custom_fields: quote.custom_fields ?? [],
    invoice_template: defaults?.invoice_template ?? "classic",
    subtotal: quote.subtotal,
    tax_amount: quote.tax_amount,
    discount: quote.discount,
    vat_rate: quote.vat_rate,
    discount_percent: quote.discount_percent,
    total: quote.total,
    from_details: quote.from_details,
    customer_details: quote.customer_details,
    note: quote.note || defaults?.default_note || null,
    payment_details: defaults?.default_payment_details || null,
  }
}
