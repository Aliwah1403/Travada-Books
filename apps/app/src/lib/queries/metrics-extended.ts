import {
  addMonths,
  differenceInCalendarDays,
  format,
  isAfter,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns"
import { supabase } from "@/lib/supabase"

// ─── Extended Metrics tab queries ───────────────────────────────────────────
//
// TODO(metrics): every function in this file pulls raw rows with supabase-js
// and aggregates them in the browser. That is fine at today's volumes but it
// pages through up to MAX_ROWS rows per chart — move each aggregation into a
// SQL RPC (like get_revenue_summary / get_cash_flow) or an API read endpoint
// before orgs reach large invoice/transaction counts.
//
// Money conventions (match lib/queries/invoices.ts and the existing RPCs):
// - Transactions: base_amount (org base currency) ?? amount. Rows with status
//   'excluded' / 'archived' and internal transfers (internal = true) are skipped.
// - Invoices: the base-currency value of a document is `converted_amount`
//   when set, else `total` (converted_amount is null when currency == base).
//   Partial balances are scaled by the same converted_amount / total ratio.

const PAGE_SIZE = 1000
const MAX_ROWS = 20_000
const ISO_DATE = "yyyy-MM-dd"
const MONTH_KEY = "yyyy-MM"

const OPEN_INVOICE_STATUSES = ["unpaid", "partially_paid", "overdue"] as const
const NOT_ISSUED_STATUSES = new Set(["draft", "scheduled", "canceled"])

type PageResult<T> = { data: T[] | null; error: unknown }

async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await page(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return rows
}

/** Date-only string ("2026-03-04" or a timestamp) → local-midnight Date. */
function toDay(value: string): Date {
  return parseISO(value.slice(0, 10))
}

function monthKey(value: string): string {
  return value.slice(0, 7)
}

/** Contiguous list of "yyyy-MM" keys covering [from, to]. */
function monthKeysInRange(from: string, to: string): string[] {
  const keys: string[] = []
  let cursor = startOfMonth(toDay(from))
  const end = toDay(to)
  while (!isAfter(cursor, end) && keys.length < 120) {
    keys.push(format(cursor, MONTH_KEY))
    cursor = addMonths(cursor, 1)
  }
  return keys
}

function monthStart(key: string): string {
  return `${key}-01`
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

function invoiceBaseRate(total: number, convertedAmount: number | null): number {
  return convertedAmount != null && total > 0 ? convertedAmount / total : 1
}

type TxRow = {
  date: string
  type: "income" | "expense"
  amount: number
  base_amount: number | null
  currency: string
  payment_mode: string | null
  customer_id: string | null
}

function txBase(row: { amount: number; base_amount: number | null }): number {
  return Number(row.base_amount ?? row.amount) || 0
}

async function fetchTransactions(
  orgId: string,
  from: string,
  to: string,
  columns: string,
  type?: "income" | "expense",
): Promise<TxRow[]> {
  // `status` and `internal` are nullable, and PostgREST's neq / not.in drop
  // NULL rows — so those two exclusions are applied here instead.
  const rows = await fetchAllRows<TxRow & { status: string | null; internal: boolean | null }>((start, end) => {
    let query = supabase
      .from("transactions")
      .select(`${columns}, status, internal`)
      .eq("org_id", orgId)
      .gte("date", from)
      .lte("date", to)
    if (type) query = query.eq("type", type)
    return query.order("id").range(start, end) as unknown as PromiseLike<
      PageResult<TxRow & { status: string | null; internal: boolean | null }>
    >
  })
  return rows.filter((row) => row.internal !== true && row.status !== "excluded" && row.status !== "archived")
}

// ─── 1. Receivables aging (live snapshot) ───────────────────────────────────

export type AgingBucketId = "current" | "1-30" | "31-60" | "61-90" | "90+"

export type AgingBucket = {
  id: AgingBucketId
  label: string
  /** Outstanding balance in base currency. */
  amount: number
  count: number
}

export type ReceivablesAging = {
  buckets: AgingBucket[]
  total: number
  /** Fraction (0–1) of the outstanding balance that is more than 30 days past due. */
  over30Share: number
  /** "yyyy-MM-dd" the snapshot was computed against. */
  asOf: string
}

export const AGING_BUCKETS: { id: AgingBucketId; label: string }[] = [
  { id: "current", label: "Not due yet" },
  { id: "1-30", label: "1–30 days" },
  { id: "31-60", label: "31–60 days" },
  { id: "61-90", label: "61–90 days" },
  { id: "90+", label: "90+ days" },
]

function agingBucketFor(daysPastDue: number): AgingBucketId {
  if (daysPastDue <= 0) return "current"
  if (daysPastDue <= 30) return "1-30"
  if (daysPastDue <= 60) return "31-60"
  if (daysPastDue <= 90) return "61-90"
  return "90+"
}

// Live: ignores the selected range, like get_outstanding_invoices. Invoices
// without a due date count as "Not due yet".
export async function getReceivablesAging(orgId: string): Promise<ReceivablesAging> {
  type Row = {
    due_date: string | null
    total: number
    amount_paid: number | null
    converted_amount: number | null
  }
  const rows = await fetchAllRows<Row>((start, end) =>
    supabase
      .from("invoices")
      .select("due_date, total, amount_paid, converted_amount")
      .eq("org_id", orgId)
      .in("status", [...OPEN_INVOICE_STATUSES])
      .order("id")
      .range(start, end) as unknown as PromiseLike<PageResult<Row>>,
  )

  const today = new Date()
  const asOf = format(today, ISO_DATE)
  const byId = new Map<AgingBucketId, AgingBucket>(
    AGING_BUCKETS.map((b) => [b.id, { ...b, amount: 0, count: 0 }]),
  )

  for (const row of rows) {
    const total = Number(row.total) || 0
    const balance = Math.max(0, total - (Number(row.amount_paid) || 0))
    if (balance <= 0) continue
    const baseBalance = balance * invoiceBaseRate(total, row.converted_amount)
    const days = row.due_date ? differenceInCalendarDays(today, toDay(row.due_date)) : 0
    const bucket = byId.get(agingBucketFor(days))!
    bucket.amount += baseBalance
    bucket.count += 1
  }

  const buckets = AGING_BUCKETS.map((b) => byId.get(b.id)!)
  const total = buckets.reduce((sum, b) => sum + b.amount, 0)
  const over30 = buckets
    .filter((b) => b.id === "31-60" || b.id === "61-90" || b.id === "90+")
    .reduce((sum, b) => sum + b.amount, 0)

  return { buckets, total, over30Share: total > 0 ? over30 / total : 0, asOf }
}

/** Inclusive due-date window for an aging bucket, relative to `asOf`. */
export function agingBucketDueRange(
  id: AgingBucketId,
  asOf: string,
): { dueFrom?: string; dueTo?: string } {
  const today = toDay(asOf)
  const iso = (days: number) => format(subDays(today, days), ISO_DATE)
  switch (id) {
    case "current":
      return { dueFrom: asOf }
    case "1-30":
      return { dueFrom: iso(30), dueTo: iso(1) }
    case "31-60":
      return { dueFrom: iso(60), dueTo: iso(31) }
    case "61-90":
      return { dueFrom: iso(90), dueTo: iso(61) }
    case "90+":
      return { dueTo: iso(91) }
  }
}

// ─── 2. Days to get paid (monthly) ──────────────────────────────────────────

export type DaysToPayMonth = {
  month: string
  /** Average days from issue date to paid date. */
  avgDaysToPay: number
  /** Average days paid after the due date (on-time / early payments count as 0). */
  avgDaysLate: number
  count: number
}

// Invoices with status 'paid' whose paid_at falls in the range, bucketed by
// the month they were paid. Months with no paid invoices are OMITTED (not
// zero-filled) — a "0 days" point would read as instant payment.
export async function getDaysToPay(orgId: string, from: string, to: string): Promise<DaysToPayMonth[]> {
  type Row = { issue_date: string | null; due_date: string | null; paid_at: string | null }
  const rows = await fetchAllRows<Row>((start, end) =>
    supabase
      .from("invoices")
      .select("issue_date, due_date, paid_at")
      .eq("org_id", orgId)
      .eq("status", "paid")
      .not("paid_at", "is", null)
      .gte("paid_at", from)
      .lt("paid_at", format(addDaysIso(to, 1), ISO_DATE))
      .order("id")
      .range(start, end) as unknown as PromiseLike<PageResult<Row>>,
  )

  const groups = new Map<string, { pay: number[]; late: number[] }>()
  for (const row of rows) {
    if (!row.paid_at || !row.issue_date) continue
    const paid = toDay(row.paid_at)
    const daysToPay = Math.max(0, differenceInCalendarDays(paid, toDay(row.issue_date)))
    const daysLate = row.due_date ? Math.max(0, differenceInCalendarDays(paid, toDay(row.due_date))) : 0
    const key = format(paid, MONTH_KEY)
    const group = groups.get(key) ?? { pay: [], late: [] }
    group.pay.push(daysToPay)
    group.late.push(daysLate)
    groups.set(key, group)
  }

  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
  return monthKeysInRange(from, to)
    .filter((key) => groups.has(key))
    .map((key) => {
      const g = groups.get(key)!
      return {
        month: monthStart(key),
        avgDaysToPay: avg(g.pay),
        avgDaysLate: avg(g.late),
        count: g.pay.length,
      }
    })
}

function addDaysIso(value: string, days: number): Date {
  const d = toDay(value)
  d.setDate(d.getDate() + days)
  return d
}

// ─── 3. Customer concentration ──────────────────────────────────────────────

export type CustomerShare = {
  customerId: string
  name: string
  amount: number
}

export type CustomerConcentration = {
  customers: CustomerShare[]
  /** Income linked to a customer (denominator for shares). */
  attributedTotal: number
  /** Income in range with no customer link — reported, not charted. */
  unattributedTotal: number
}

// SOURCE: income transactions in range (base_amount ?? amount), attributed to
// transactions.customer_id, falling back to the linked invoice's customer_id.
// Transactions (money actually received) rather than paid invoices, so the
// figure lines up with the Revenue chart. Sorted by amount, descending.
export async function getCustomerConcentration(
  orgId: string,
  from: string,
  to: string,
): Promise<CustomerConcentration> {
  type Row = TxRow & {
    customer: { name: string | null } | null
    invoice: { customer_id: string | null; customer_name: string | null } | null
  }
  const rows = (await fetchTransactions(
    orgId,
    from,
    to,
    "amount, base_amount, customer_id, customer:customers(name), invoice:invoices(customer_id, customer_name)",
    "income",
  )) as unknown as Row[]

  const byCustomer = new Map<string, CustomerShare>()
  let unattributedTotal = 0
  for (const row of rows) {
    const value = txBase(row)
    const customerId = row.customer_id ?? row.invoice?.customer_id ?? null
    if (!customerId) {
      unattributedTotal += value
      continue
    }
    const existing = byCustomer.get(customerId)
    if (existing) {
      existing.amount += value
    } else {
      byCustomer.set(customerId, {
        customerId,
        name: row.customer?.name ?? row.invoice?.customer_name ?? "Unnamed customer",
        amount: value,
      })
    }
  }

  const customers = [...byCustomer.values()].filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount)
  const attributedTotal = customers.reduce((sum, c) => sum + c.amount, 0)
  return { customers, attributedTotal, unattributedTotal }
}

// ─── 4. Payment channels (monthly, income) ──────────────────────────────────

export const PAYMENT_CHANNELS = [
  { key: "mpesa", label: "M-Pesa", color: "var(--chart-2)" },
  { key: "bank_transfer", label: "Bank transfer", color: "var(--chart-1)" },
  { key: "card", label: "Card", color: "var(--chart-3)" },
  { key: "cash", label: "Cash", color: "var(--chart-4)" },
  { key: "cheque", label: "Cheque", color: "var(--chart-5)" },
  { key: "unspecified", label: "Other / unspecified", color: "var(--muted-foreground)" },
] as const

export type PaymentChannelKey = (typeof PAYMENT_CHANNELS)[number]["key"]

export type PaymentChannelMonth = { month: string } & Record<PaymentChannelKey, number>

// Income transactions grouped by payment_mode per month (zero-filled).
// 'other' and NULL are merged into "Other / unspecified".
export async function getPaymentChannels(orgId: string, from: string, to: string): Promise<PaymentChannelMonth[]> {
  const rows = await fetchTransactions(orgId, from, to, "date, amount, base_amount, payment_mode", "income")
  const empty = (): Record<PaymentChannelKey, number> => ({
    mpesa: 0,
    bank_transfer: 0,
    card: 0,
    cash: 0,
    cheque: 0,
    unspecified: 0,
  })
  const byMonth = new Map(monthKeysInRange(from, to).map((k) => [k, empty()]))
  for (const row of rows) {
    const bucket = byMonth.get(monthKey(row.date))
    if (!bucket) continue
    const mode = row.payment_mode
    const key: PaymentChannelKey =
      mode === "mpesa" || mode === "bank_transfer" || mode === "card" || mode === "cash" || mode === "cheque"
        ? mode
        : "unspecified"
    bucket[key] += txBase(row)
  }
  return [...byMonth.entries()].map(([key, values]) => ({ month: monthStart(key), ...values }))
}

// ─── 5. Invoice-to-cash funnel ──────────────────────────────────────────────

export type InvoiceFunnel = {
  sent: number
  viewed: number
  anyPayment: number
  paidInFull: number
  /** Median days from sent_at to viewed_at (invoices with both). */
  medianDaysToView: number | null
  /** Median days from sent_at (or issue date) to paid_at, for fully paid invoices. */
  medianDaysToPaid: number | null
}

// Cohort: invoices ISSUED in the range that actually went out (not draft /
// scheduled / canceled). Stages are cumulative "reached at least":
// a payment implies the invoice was seen, so paid invoices without a
// viewed_at (e.g. paid from a PDF/email attachment) still count as Viewed.
export async function getInvoiceFunnel(orgId: string, from: string, to: string): Promise<InvoiceFunnel> {
  type Row = {
    status: string
    issue_date: string | null
    sent_at: string | null
    viewed_at: string | null
    paid_at: string | null
    amount_paid: number | null
  }
  const rows = await fetchAllRows<Row>((start, end) =>
    supabase
      .from("invoices")
      .select("status, issue_date, sent_at, viewed_at, paid_at, amount_paid")
      .eq("org_id", orgId)
      .gte("issue_date", from)
      .lte("issue_date", to)
      .order("id")
      .range(start, end) as unknown as PromiseLike<PageResult<Row>>,
  )

  let sent = 0
  let viewed = 0
  let anyPayment = 0
  let paidInFull = 0
  const toView: number[] = []
  const toPaid: number[] = []

  for (const row of rows) {
    if (NOT_ISSUED_STATUSES.has(row.status)) continue
    sent += 1
    const isPaid = row.status === "paid"
    const hasPayment = isPaid || row.status === "partially_paid" || (Number(row.amount_paid) || 0) > 0
    if (row.viewed_at || hasPayment) viewed += 1
    if (hasPayment) anyPayment += 1
    if (isPaid) paidInFull += 1

    const sentDay = row.sent_at ?? row.issue_date
    if (row.sent_at && row.viewed_at) {
      toView.push(Math.max(0, differenceInCalendarDays(toDay(row.viewed_at), toDay(row.sent_at))))
    }
    if (isPaid && row.paid_at && sentDay) {
      toPaid.push(Math.max(0, differenceInCalendarDays(toDay(row.paid_at), toDay(sentDay))))
    }
  }

  return {
    sent,
    viewed,
    anyPayment,
    paidInFull,
    medianDaysToView: median(toView),
    medianDaysToPaid: median(toPaid),
  }
}

// ─── 6. Revenue vs previous period (range helper) ───────────────────────────

/** The same-length window immediately before [from, to] (inclusive dates). */
export function previousPeriod(from: string, to: string): { from: string; to: string } {
  const start = toDay(from)
  const length = differenceInCalendarDays(toDay(to), start) + 1
  return {
    from: format(subDays(start, length), ISO_DATE),
    to: format(subDays(start, 1), ISO_DATE),
  }
}

// ─── 7. Currency exposure ───────────────────────────────────────────────────

export type CurrencyExposure = {
  currency: string
  /** Income in base currency. */
  income: number
  /** Expenses in base currency. */
  expense: number
}

// Totals by ORIGINAL transaction currency, valued in base (base_amount ?? amount).
// Sorted by total volume descending.
export async function getCurrencyExposure(orgId: string, from: string, to: string): Promise<CurrencyExposure[]> {
  const rows = await fetchTransactions(orgId, from, to, "type, currency, amount, base_amount")
  const byCurrency = new Map<string, CurrencyExposure>()
  for (const row of rows) {
    const code = (row.currency || "").toUpperCase()
    if (!code) continue
    const entry = byCurrency.get(code) ?? { currency: code, income: 0, expense: 0 }
    if (row.type === "income") entry.income += txBase(row)
    else if (row.type === "expense") entry.expense += txBase(row)
    byCurrency.set(code, entry)
  }
  return [...byCurrency.values()].sort((a, b) => b.income + b.expense - (a.income + a.expense))
}
