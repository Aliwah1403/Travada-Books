import { addDays, addMonths, addYears, differenceInCalendarDays, format, parseISO } from "date-fns"
import { supabase } from "@/lib/supabase"
import { getRunway } from "@/lib/queries/metrics"

// ─── Forward cash forecast ("cash calendar") ─────────────────────────────────
//
// Projects the org's balance day by day over the next N days from:
//   • the live cash balance (get_runway) — or 0 when no opening balance is set
//   • open invoices, landing on their due date shifted by how late that
//     customer usually pays
//   • unpaid bills with a due date in the window
//   • recurring expense transactions, projected forward by their frequency
//
// Everything is in the org's BASE currency. Display-currency conversion (the
// dashboard's fxRate) is the caller's job, same as every other widget.
//
// `computeCashForecast` is pure (no Date.now, no I/O) so it can be unit-tested
// and reused by the assistant; `getCashForecast` is the thin fetch wrapper.

export const FORECAST_HORIZON_DAYS = 60
/** Expected date for invoices whose (lateness-adjusted) date is already past. */
const PAST_DUE_GRACE_DAYS = 7

const OPEN_INVOICE_STATUSES = ["unpaid", "partially_paid", "overdue"] as const

// ─── Raw row shapes (what the queries select) ─────────────────────────────────

export type ForecastInvoiceRow = {
  id: string
  invoice_number: string | null
  customer_id: string | null
  customer_name: string | null
  status: string
  due_date: string | null
  total: number | string | null
  amount_paid: number | string | null
  currency: string | null
  converted_amount: number | string | null
  exchange_rate: number | string | null
}

export type ForecastPaidInvoiceRow = {
  customer_id: string | null
  due_date: string | null
  paid_at: string | null
}

export type ForecastBillRow = {
  id: string
  vendor_name: string
  bill_number: string | null
  amount: number | string
  currency: string
  due_date: string | null
}

export type ForecastRecurringRow = {
  id: string
  name: string
  counterparty_name: string | null
  date: string
  amount: number | string
  currency: string
  base_amount: number | string | null
  base_currency: string | null
  frequency: string | null
}

export type ForecastInput = {
  baseCurrency: string
  /** Live cash balance in base currency; null when no opening balance is configured. */
  cashBalance: number | null
  isConfigured: boolean
  openInvoices: ForecastInvoiceRow[]
  paidInvoices: ForecastPaidInvoiceRow[]
  unpaidBills: ForecastBillRow[]
  recurringExpenses: ForecastRecurringRow[]
}

// ─── Output ────────────────────────────────────────────────────────────────────

export type ForecastEventKind = "invoice" | "bill" | "recurring_expense"

export type ForecastEvent = {
  id: string
  kind: ForecastEventKind
  direction: "in" | "out"
  /** Expected date, yyyy-MM-dd. */
  date: string
  /** Positive, base currency. */
  amount: number
  /** Customer / vendor / expense name. */
  label: string
  /** Invoice or bill number, when there is one. */
  reference: string | null
  href: string
  /** Due date already passed (invoice or bill). */
  overdue: boolean
  /** The record's own due date (invoices and bills), yyyy-MM-dd. */
  dueDate: string | null
  /** Invoices only — the customer's own average days late, when they have history. */
  customerId?: string | null
  customerAvgDaysLate?: number | null
  /** Recurring expenses only. */
  frequency?: string
}

export type ForecastDay = {
  date: string
  inflow: number
  outflow: number
  balance: number
}

export type CashForecast = {
  /** yyyy-MM-dd the forecast was computed for (day 0). */
  today: string
  horizonDays: number
  baseCurrency: string
  startBalance: number
  isConfigured: boolean
  days: ForecastDay[]
  /** All events inside the window, sorted by date (then largest first). */
  events: ForecastEvent[]
  lowest: { date: string; balance: number }
  totals: { inflow: number; outflow: number }
  /** Org-wide average days late on paid invoices (0 when no history). */
  orgAvgDaysLate: number
  skipped: {
    /** Bills not in the base currency — there's no stored conversion for bills. */
    foreignBills: number
    /** Foreign-currency invoices with neither converted_amount nor exchange_rate. */
    unconvertibleInvoices: number
    /** Recurring expenses not in base currency and without base_amount. */
    unconvertibleRecurring: number
  }
}

// ─── Pure computation ──────────────────────────────────────────────────────────

const num = (v: number | string | null | undefined): number => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

const toDay = (d: Date) => format(d, "yyyy-MM-dd")
/** First 10 chars of a date/timestamp string → a local-midnight Date. */
const parseDay = (s: string) => parseISO(s.slice(0, 10))

function invoiceBalanceInBase(inv: ForecastInvoiceRow, baseCurrency: string): number | null {
  const total = num(inv.total)
  const balance = total - num(inv.amount_paid)
  if (balance <= 0) return 0
  if (!inv.currency || inv.currency === baseCurrency) return balance
  const converted = inv.converted_amount != null ? num(inv.converted_amount) : null
  if (converted != null && converted > 0 && total > 0) return balance * (converted / total)
  const rate = inv.exchange_rate != null ? num(inv.exchange_rate) : null
  if (rate != null && rate > 0) return balance * rate
  return null
}

/** Average days late per customer + org-wide, from paid invoices (late = paid_at − due_date, clamped ≥ 0). */
export function computeLateness(paid: ForecastPaidInvoiceRow[]) {
  const perCustomer = new Map<string, { sum: number; n: number }>()
  let orgSum = 0
  let orgN = 0
  for (const row of paid) {
    if (!row.due_date || !row.paid_at) continue
    const late = Math.max(0, differenceInCalendarDays(parseDay(row.paid_at), parseDay(row.due_date)))
    orgSum += late
    orgN += 1
    if (row.customer_id) {
      const acc = perCustomer.get(row.customer_id) ?? { sum: 0, n: 0 }
      acc.sum += late
      acc.n += 1
      perCustomer.set(row.customer_id, acc)
    }
  }
  const byCustomer = new Map<string, number>()
  for (const [id, { sum, n }] of perCustomer) byCustomer.set(id, Math.round(sum / n))
  return { byCustomer, orgAvg: orgN > 0 ? Math.round(orgSum / orgN) : 0 }
}

type Frequency = "weekly" | "biweekly" | "monthly" | "semi_monthly" | "annually"

function stepDate(anchor: Date, frequency: Frequency, k: number): Date {
  switch (frequency) {
    case "weekly":
      return addDays(anchor, 7 * k)
    case "biweekly":
      return addDays(anchor, 14 * k)
    // Twice a month — approximated as every 15 days from the last occurrence.
    case "semi_monthly":
      return addDays(anchor, 15 * k)
    case "monthly":
      return addMonths(anchor, k)
    case "annually":
      return addYears(anchor, k)
  }
}

/** Rough period length, used to drop series that look like they've stopped. */
const PERIOD_DAYS: Record<Frequency, number> = {
  weekly: 7,
  biweekly: 14,
  semi_monthly: 15,
  monthly: 31,
  annually: 366,
}

const isProjectableFrequency = (f: string | null): f is Frequency =>
  f === "weekly" || f === "biweekly" || f === "monthly" || f === "semi_monthly" || f === "annually"

export function computeCashForecast(
  input: ForecastInput,
  today: string,
  horizonDays: number = FORECAST_HORIZON_DAYS
): CashForecast {
  const { baseCurrency } = input
  const day0 = parseDay(today)
  const lastDay = addDays(day0, horizonDays - 1)
  const lastDayStr = toDay(lastDay)
  const inWindow = (d: string) => d >= today && d <= lastDayStr

  const events: ForecastEvent[] = []
  const skipped = { foreignBills: 0, unconvertibleInvoices: 0, unconvertibleRecurring: 0 }

  // ── Money in: open invoices ──────────────────────────────────────────────
  const lateness = computeLateness(input.paidInvoices)
  for (const inv of input.openInvoices) {
    const amount = invoiceBalanceInBase(inv, baseCurrency)
    if (amount == null) {
      skipped.unconvertibleInvoices += 1
      continue
    }
    if (amount <= 0) continue

    const customerLate = inv.customer_id != null ? (lateness.byCustomer.get(inv.customer_id) ?? null) : null
    const lateDays = customerLate ?? lateness.orgAvg
    const dueDate = inv.due_date ? inv.due_date.slice(0, 10) : null
    const overdue = inv.status === "overdue" || (dueDate != null && dueDate < today)

    let expected = dueDate ? toDay(addDays(parseDay(dueDate), lateDays)) : toDay(addDays(day0, PAST_DUE_GRACE_DAYS))
    if (expected < today) expected = toDay(addDays(day0, PAST_DUE_GRACE_DAYS))
    if (!inWindow(expected)) continue

    events.push({
      id: `invoice:${inv.id}`,
      kind: "invoice",
      direction: "in",
      date: expected,
      amount,
      label: inv.customer_name || "Customer",
      reference: inv.invoice_number,
      href: `/invoices/${inv.id}`,
      overdue,
      dueDate,
      customerId: inv.customer_id,
      customerAvgDaysLate: customerLate,
    })
  }

  // ── Money out: unpaid bills ──────────────────────────────────────────────
  for (const bill of input.unpaidBills) {
    if (!bill.due_date) continue
    const dueDate = bill.due_date.slice(0, 10)
    if (dueDate > lastDayStr) continue
    // Bills store no converted amount, so only base-currency bills can be
    // placed on the calendar honestly.
    if (bill.currency !== baseCurrency) {
      skipped.foreignBills += 1
      continue
    }
    const amount = Math.abs(num(bill.amount))
    if (amount <= 0) continue
    const overdue = dueDate < today
    events.push({
      id: `bill:${bill.id}`,
      kind: "bill",
      direction: "out",
      // A bill that's already past due is owed now.
      date: overdue ? today : dueDate,
      amount,
      label: bill.vendor_name || "Bill",
      reference: bill.bill_number,
      href: `/bills?open=${bill.id}`,
      overdue,
      dueDate,
    })
  }

  // ── Money out: recurring expenses ────────────────────────────────────────
  // One series per (counterparty-or-name, frequency); the latest occurrence is
  // the anchor and the amount to repeat.
  const series = new Map<string, ForecastRecurringRow>()
  for (const tx of input.recurringExpenses) {
    if (!isProjectableFrequency(tx.frequency)) continue
    const who = (tx.counterparty_name || tx.name || "").trim().toLowerCase()
    const key = `${who}|${tx.frequency}`
    const existing = series.get(key)
    if (!existing || tx.date > existing.date) series.set(key, tx)
  }

  for (const tx of series.values()) {
    const frequency = tx.frequency as Frequency
    let amount: number | null = null
    if (tx.base_amount != null && (tx.base_currency == null || tx.base_currency === baseCurrency)) {
      amount = Math.abs(num(tx.base_amount))
    } else if (tx.currency === baseCurrency) {
      amount = Math.abs(num(tx.amount))
    }
    if (amount == null) {
      skipped.unconvertibleRecurring += 1
      continue
    }
    if (amount <= 0) continue

    const anchor = parseDay(tx.date)
    // A series whose last occurrence is more than two periods old has
    // probably stopped — don't keep charging it.
    if (differenceInCalendarDays(day0, anchor) > PERIOD_DAYS[frequency] * 2) continue

    for (let k = 1; k < 400; k++) {
      const d = toDay(stepDate(anchor, frequency, k))
      if (d > lastDayStr) break
      if (d < today) continue
      events.push({
        id: `recurring:${tx.id}:${d}`,
        kind: "recurring_expense",
        direction: "out",
        date: d,
        amount,
        label: tx.counterparty_name || tx.name || "Recurring expense",
        reference: null,
        href: `/transactions?open=${tx.id}`,
        overdue: false,
        dueDate: null,
        frequency,
      })
    }
  }

  events.sort((a, b) => (a.date === b.date ? b.amount - a.amount : a.date < b.date ? -1 : 1))

  // ── Day-by-day running balance ───────────────────────────────────────────
  const startBalance = input.isConfigured ? (input.cashBalance ?? 0) : 0
  const byDate = new Map<string, { inflow: number; outflow: number }>()
  for (const e of events) {
    const acc = byDate.get(e.date) ?? { inflow: 0, outflow: 0 }
    if (e.direction === "in") acc.inflow += e.amount
    else acc.outflow += e.amount
    byDate.set(e.date, acc)
  }

  const days: ForecastDay[] = []
  let balance = startBalance
  let lowest = { date: today, balance: Number.POSITIVE_INFINITY }
  let totalIn = 0
  let totalOut = 0
  for (let i = 0; i < horizonDays; i++) {
    const date = toDay(addDays(day0, i))
    const flow = byDate.get(date) ?? { inflow: 0, outflow: 0 }
    balance += flow.inflow - flow.outflow
    totalIn += flow.inflow
    totalOut += flow.outflow
    days.push({ date, inflow: flow.inflow, outflow: flow.outflow, balance })
    if (balance < lowest.balance) lowest = { date, balance }
  }
  if (!Number.isFinite(lowest.balance)) lowest = { date: today, balance: startBalance }

  return {
    today,
    horizonDays,
    baseCurrency,
    startBalance,
    isConfigured: input.isConfigured,
    days,
    events,
    lowest,
    totals: { inflow: totalIn, outflow: totalOut },
    orgAvgDaysLate: lateness.orgAvg,
    skipped,
  }
}

// ─── Fetch wrapper ─────────────────────────────────────────────────────────────

export const forecastQueryKey = (orgId: string) => ["forecast", orgId] as const
export const FORECAST_STALE_TIME = 2 * 60 * 1000

/** Today in the viewer's local calendar, yyyy-MM-dd. */
export const localToday = () => toDay(new Date())

export async function getCashForecast(
  orgId: string,
  baseCurrency: string,
  today: string = localToday(),
  horizonDays: number = FORECAST_HORIZON_DAYS
): Promise<CashForecast> {
  const lastDay = toDay(addDays(parseDay(today), horizonDays - 1))

  const [runway, openInvoices, paidInvoices, unpaidBills, recurring] = await Promise.all([
    getRunway(orgId),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, customer_id, customer_name, status, due_date, total, amount_paid, currency, converted_amount, exchange_rate"
      )
      .eq("org_id", orgId)
      .in("status", [...OPEN_INVOICE_STATUSES]),
    // Payment history for lateness — most recent 1,000 paid invoices is plenty
    // for a per-customer average.
    supabase
      .from("invoices")
      .select("customer_id, due_date, paid_at")
      .eq("org_id", orgId)
      .eq("status", "paid")
      .not("paid_at", "is", null)
      .not("due_date", "is", null)
      .order("paid_at", { ascending: false })
      .limit(1000),
    supabase
      .from("bills")
      .select("id, vendor_name, bill_number, amount, currency, due_date")
      .eq("org_id", orgId)
      .eq("status", "unpaid")
      .not("due_date", "is", null)
      .lte("due_date", lastDay),
    supabase
      .from("transactions")
      .select("id, name, counterparty_name, date, amount, currency, base_amount, base_currency, frequency")
      .eq("org_id", orgId)
      .eq("type", "expense")
      .eq("recurring", true)
      .eq("internal", false)
      .neq("status", "excluded")
      .neq("status", "archived")
      .order("date", { ascending: false })
      .limit(1000),
  ])

  if (openInvoices.error) throw openInvoices.error
  if (paidInvoices.error) throw paidInvoices.error
  if (unpaidBills.error) throw unpaidBills.error
  if (recurring.error) throw recurring.error

  return computeCashForecast(
    {
      baseCurrency,
      cashBalance: runway?.cash_balance ?? null,
      isConfigured: Boolean(runway?.is_configured),
      openInvoices: (openInvoices.data ?? []) as ForecastInvoiceRow[],
      paidInvoices: (paidInvoices.data ?? []) as ForecastPaidInvoiceRow[],
      unpaidBills: (unpaidBills.data ?? []) as ForecastBillRow[],
      recurringExpenses: (recurring.data ?? []) as ForecastRecurringRow[],
    },
    today,
    horizonDays
  )
}
