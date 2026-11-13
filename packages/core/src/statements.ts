// What goes on a statement of account, shared by the app's direct write and
// the API (API-WRITES-PLAN.md domain 3). A statement is an immutable snapshot:
// the invoices issued in the period, the real payments received in it, and an
// opening balance carried in from before it.

/** Invoices that were actually billed — drafts, scheduled and canceled ones never were money owed. */
export const STATEMENT_INVOICE_STATUSES: ReadonlySet<string> = new Set(["unpaid", "partially_paid", "overdue", "paid"])

export type StatementSourceInvoice = {
  id: string
  invoice_number: string | null
  status: string
  issue_date: string | null
  due_date: string | null
  total: number | null
  currency: string
  paid_at: string | null
  amount_paid: number | null
  created_at: string
}

export type StatementSourcePayment = {
  invoice_id: string
  amount: number
  paid_at: string
  currency: string | null
}

/** One invoice row in `statements.snapshot_data`. */
export type StatementSnapshotInvoice = {
  id: string
  invoice_number: string | null
  status: string
  issue_date: string | null
  due_date: string | null
  total: number | null
  currency: string
  paid_at: string | null
  amount_paid: number
}

/** One payment row in `statements.payments_snapshot`. */
export type StatementSnapshotPayment = {
  invoice_id: string | null
  invoice_number: string | null
  amount: number
  paid_at: string
  currency: string | null
}

export type StatementSnapshot = {
  opening_balance: number
  snapshot_data: StatementSnapshotInvoice[]
  payments_snapshot: StatementSnapshotPayment[]
}

/** The calendar date ("YYYY-MM-DD") of a timestamp in a timezone. */
export function calendarDateIn(timestamp: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(timestamp),
  )
}

const cents = (value: number) => Math.round(value * 100) / 100

/**
 * Builds a statement for [dateFrom, dateTo] (inclusive calendar dates) from a
 * customer's invoices and the payments recorded against them. Dates are
 * compared as calendar days in `timeZone` (the user's), so a payment made late
 * on the 31st local time stays on the 31st.
 *
 * - Invoices issued in the period are listed; earlier ones feed the opening balance.
 * - Payments on any billed invoice count: before the period they reduce the
 *   opening balance, inside it they're listed, after it they're left for a
 *   later statement.
 */
export function buildStatementSnapshot(params: {
  invoices: StatementSourceInvoice[]
  payments: StatementSourcePayment[]
  dateFrom: string
  dateTo: string
  timeZone: string
}): StatementSnapshot {
  const { dateFrom, dateTo, timeZone } = params
  const billed = params.invoices.filter((inv) => STATEMENT_INVOICE_STATUSES.has(inv.status))
  const billedIds = new Set(billed.map((inv) => inv.id))
  const numberById = new Map(billed.map((inv) => [inv.id, inv.invoice_number]))

  const invoiceDate = (inv: StatementSourceInvoice) => inv.issue_date ?? calendarDateIn(inv.created_at, timeZone)
  const paymentDate = (p: StatementSourcePayment) => calendarDateIn(p.paid_at, timeZone)
  const payments = params.payments.filter((p) => billedIds.has(p.invoice_id))

  const invoicesBefore = billed.filter((inv) => invoiceDate(inv) < dateFrom)
  const invoicesIn = billed.filter((inv) => {
    const d = invoiceDate(inv)
    return d >= dateFrom && d <= dateTo
  })
  const paymentsBefore = payments.filter((p) => paymentDate(p) < dateFrom)
  const paymentsIn = payments.filter((p) => {
    const d = paymentDate(p)
    return d >= dateFrom && d <= dateTo
  })

  const opening =
    invoicesBefore.reduce((sum, inv) => sum + (inv.total ?? 0), 0) - paymentsBefore.reduce((sum, p) => sum + p.amount, 0)

  return {
    opening_balance: cents(opening),
    snapshot_data: invoicesIn.map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      status: inv.status,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      total: inv.total,
      currency: inv.currency,
      paid_at: inv.paid_at,
      amount_paid: inv.amount_paid ?? 0,
    })),
    payments_snapshot: paymentsIn.map((p) => ({
      invoice_id: p.invoice_id,
      invoice_number: numberById.get(p.invoice_id) ?? null,
      amount: p.amount,
      paid_at: p.paid_at,
      currency: p.currency,
    })),
  }
}
