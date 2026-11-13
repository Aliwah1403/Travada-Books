// Invoice rules shared by the app, the API and the worker.

export type InvoiceRecurringFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"

/** Statuses an invoice can be in (invoices_status_check). */
export const INVOICE_STATUSES = ["draft", "scheduled", "unpaid", "partially_paid", "overdue", "paid", "canceled"] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

// total is nullable (drafts may not have a computed total yet); amount_paid
// is always present (defaults to 0 in the DB). Never reads amount_paid off
// a stale client write — it is derived exclusively by the invoice_payments
// sync trigger.
export function invoiceBalance(inv: { total: number | null; amount_paid: number }): number {
  return (inv.total ?? 0) - (inv.amount_paid ?? 0)
}

// Status to restore a canceled invoice to on "Reopen invoice" — mirrors the
// same rules sync_invoice_payment_state() uses for an active invoice: overdue
// if already past due (plain string compare against "YYYY-MM-DD" today,
// matching mark-overdue's worker task), else unpaid — or partially_paid if
// money was already recorded before it was canceled.
//
// `today` defaults to the runtime's local date (right in the browser); on the
// server pass today in the organisation's or user's timezone.
export function reopenInvoiceStatus(
  inv: { due_date: string | null; amount_paid: number },
  today: string = new Date().toLocaleDateString("en-CA"),
): InvoiceStatus {
  if (inv.due_date && inv.due_date < today) return "overdue"
  return (inv.amount_paid ?? 0) > 0 ? "partially_paid" : "unpaid"
}

/** When an invoice can be edited (the edit page redirects anything else). */
export function isInvoiceEditable(status: string): boolean {
  return status === "draft"
}

/** When an invoice can be canceled: issued, not settled, and no payments recorded. */
export function isInvoiceCancelable(status: string, amountPaid: number): boolean {
  return (status === "unpaid" || status === "overdue" || status === "scheduled") && (amountPaid ?? 0) <= 0
}

/** Statuses that can take a payment. */
export function canRecordPayment(status: string): boolean {
  return status !== "paid" && status !== "canceled" && status !== "scheduled" && status !== "draft"
}

/** Next date in a recurring series, "YYYY-MM-DD" in and out. */
export function addFrequency(dateStr: string, frequency: InvoiceRecurringFrequency): string {
  const d = new Date(dateStr + "T00:00:00Z")

  if (frequency === "weekly") {
    d.setUTCDate(d.getUTCDate() + 7)
    return d.toISOString().split("T")[0]!
  }
  if (frequency === "biweekly") {
    d.setUTCDate(d.getUTCDate() + 14)
    return d.toISOString().split("T")[0]!
  }

  // For month-based frequencies, clamp the day to the last day of the target
  // month so Jan 31 -> Feb 28/29, not Mar 3.
  const monthOffsets: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 12 }
  const offset = monthOffsets[frequency]!
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth()
  const day = d.getUTCDate()
  const targetMonth = month + offset
  const targetYear = year + Math.floor(targetMonth / 12)
  const targetMonthIndex = targetMonth % 12
  // Day 0 of the next month = last day of targetMonth
  const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate()
  const clampedDay = Math.min(day, lastDay)
  return new Date(Date.UTC(targetYear, targetMonthIndex, clampedDay)).toISOString().split("T")[0]!
}
