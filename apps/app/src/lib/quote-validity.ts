import { format } from "date-fns"

/**
 * `valid_until` is a Postgres `date` ("YYYY-MM-DD"). Comparing it via
 * `new Date(validUntil) < new Date()` treats it as UTC midnight, so the quote
 * reads as expired for the entire last valid day in any timezone behind UTC.
 * Compare calendar-date strings instead so the quote stays valid through the
 * whole of its valid-until day (matches the worker's expiry logic).
 */
export function isPastValidUntil(validUntil: string | null | undefined): boolean {
  if (!validUntil) return false
  const today = format(new Date(), "yyyy-MM-dd")
  return validUntil < today
}
