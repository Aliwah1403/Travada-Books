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
