import { addDays, differenceInCalendarDays, format, parseISO, subDays } from "date-fns"
import { supabase } from "@/lib/supabase"
import type { CashForecast } from "@/lib/queries/forecast"

// ─── Cash story: actual balance history → forecast ───────────────────────────
//
// One continuous daily series for the Overview's cash chart: the last
// CASH_HISTORY_DAYS of ACTUAL balance (ending today) followed by the forecast
// (lib/queries/forecast.ts) for the days after today.
//
// How the actual history reconciles with the forecast:
//   • Configured org (opening balance set) — the series is anchored on the
//     forecast's own start balance (= get_runway's cash_balance) and walked
//     BACKWARDS: balance(d − 1) = balance(d) − net(d). So "today" equals the
//     forecast's start by construction. The transaction filter mirrors
//     get_runway's SQL exactly (internal = false, status NOT IN
//     ('excluded','archived') — NULLs dropped, like SQL — and date ≥
//     opening_balance_date). Transactions dated after today are counted in
//     get_runway's balance, so they're folded into today's point here too.
//     The series starts at the opening balance date when that's inside the
//     window (there's no "actual" before it).
//   • No opening balance — there's no real balance to show, so the history is
//     NET CASH since the window start (0 on the first day, cumulative after)
//     and the forecast (which starts at 0 for these orgs) is shifted up by
//     today's net so the two halves join.
//
// Everything is in the org's BASE currency; the component applies fxRate.
// `computeCashStory` is pure — the assistant can reuse it.

export const CASH_HISTORY_DAYS = 90
const PAGE_SIZE = 1000
const MAX_ROWS = 20_000
/** Moments closer than this many days are merged (labels would collide). */
const MOMENT_MIN_GAP_DAYS = 6
const MAX_MOMENTS = 5

export type CashHistoryTxRow = {
  id: string
  date: string
  type: string
  amount: number | string
  base_amount: number | string | null
  name: string | null
  counterparty_name: string | null
  status: string | null
  internal: boolean | null
  customer: { name: string | null } | null
  invoice: { customer_name: string | null } | null
}

export type CashHistoryInput = {
  openingBalanceDate: string | null
  /** Ledger rows dated on/after the window start (future-dated included). */
  transactions: CashHistoryTxRow[]
}

export type CashStoryPoint = {
  date: string
  /** Balance (or net position) at the end of the day, base currency. */
  balance: number
  inflow: number
  outflow: number
  isForecast: boolean
}

export type CashMomentKind = "big_in" | "big_out" | "low_point" | "expected_in" | "expected_out"

export type CashMoment = {
  id: string
  kind: CashMomentKind
  date: string
  /** Short who/what — "Mombasa Freight paid", "Lowest point". */
  title: string
  /** Signed base amount: + money in, − money out; the balance for low_point. */
  amount: number
  href?: string
}

export type CashStory = {
  today: string
  mode: "balance" | "net"
  points: CashStoryPoint[]
  /** Index of today's point in `points` — the forecast is dashed from here. */
  todayIndex: number
  historyStart: string
  todayBalance: number
  moments: CashMoment[]
  stats: {
    /** Lowest balance from today through the horizon (today included). */
    lowest: { date: string; balance: number }
    lowestIsToday: boolean
    expectedIn: number
    expectedOut: number
    horizonDays: number
  }
}

const num = (v: number | string | null | undefined): number => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}
const toDay = (d: Date) => format(d, "yyyy-MM-dd")

// ─── Fetch ──────────────────────────────────────────────────────────────────

export const cashHistoryQueryKey = (orgId: string, today: string) => ["cash-history", orgId, today] as const

export async function getCashHistoryInput(
  orgId: string,
  today: string,
  days: number = CASH_HISTORY_DAYS
): Promise<CashHistoryInput> {
  const windowStart = toDay(subDays(parseISO(today), days - 1))

  const orgRes = await supabase
    .from("organizations")
    .select("opening_balance_date")
    .eq("id", orgId)
    .maybeSingle()
  if (orgRes.error) throw orgRes.error

  const transactions: CashHistoryTxRow[] = []
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id, date, type, amount, base_amount, name, counterparty_name, status, internal, customer:customers(name), invoice:invoices(customer_name)"
      )
      .eq("org_id", orgId)
      .gte("date", windowStart)
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    const batch = (data ?? []) as unknown as CashHistoryTxRow[]
    transactions.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }

  return {
    openingBalanceDate: (orgRes.data?.opening_balance_date as string | null | undefined) ?? null,
    transactions,
  }
}

// ─── Pure computation ───────────────────────────────────────────────────────

/** Same predicate as get_runway (SQL NULL semantics: NULL status / internal are dropped). */
function countsTowardBalance(tx: CashHistoryTxRow): boolean {
  return tx.internal === false && tx.status != null && tx.status !== "excluded" && tx.status !== "archived"
}

function whoFor(tx: CashHistoryTxRow): string {
  return (tx.customer?.name || tx.invoice?.customer_name || tx.counterparty_name || tx.name || "").trim()
}

type DayFlow = {
  inflow: number
  outflow: number
  topIn: { who: string; amount: number; count: number } | null
  topOut: { who: string; amount: number; count: number } | null
}

export function computeCashStory(
  history: CashHistoryInput,
  forecast: CashForecast,
  days: number = CASH_HISTORY_DAYS
): CashStory {
  const today = forecast.today
  const day0 = parseISO(today)
  const windowStart = toDay(subDays(day0, days - 1))
  const mode: CashStory["mode"] = forecast.isConfigured ? "balance" : "net"
  const openingDate = mode === "balance" && history.openingBalanceDate ? history.openingBalanceDate.slice(0, 10) : null
  const seriesStart = openingDate && openingDate > windowStart ? openingDate : windowStart

  // ── Daily flows (future-dated rows folded into today) ─────────────────────
  const flows = new Map<string, DayFlow>()
  const perDayWho = new Map<string, Map<string, { amount: number; count: number }>>()
  for (const tx of history.transactions) {
    if (!countsTowardBalance(tx)) continue
    const raw = tx.date.slice(0, 10)
    if (openingDate && raw < openingDate) continue
    if (raw < seriesStart) continue
    const date = raw > today ? today : raw
    const value = Math.abs(num(tx.base_amount ?? tx.amount))
    if (value === 0) continue
    const isIn = tx.type === "income"
    const flow = flows.get(date) ?? { inflow: 0, outflow: 0, topIn: null, topOut: null }
    if (isIn) flow.inflow += value
    else flow.outflow += value
    flows.set(date, flow)

    const key = `${date}|${isIn ? "in" : "out"}`
    const whoMap = perDayWho.get(key) ?? new Map()
    const who = whoFor(tx)
    const acc = whoMap.get(who) ?? { amount: 0, count: 0 }
    acc.amount += value
    acc.count += 1
    whoMap.set(who, acc)
    perDayWho.set(key, whoMap)
  }
  for (const [key, whoMap] of perDayWho) {
    const [date, dir] = key.split("|")
    let best: { who: string; amount: number; count: number } | null = null
    let count = 0
    for (const [who, v] of whoMap) {
      count += v.count
      if (!best || v.amount > best.amount) best = { who, amount: v.amount, count: v.count }
    }
    const flow = flows.get(date!)!
    if (best) {
      const top = { ...best, count }
      if (dir === "in") flow.topIn = top
      else flow.topOut = top
    }
  }

  // ── Actual series ─────────────────────────────────────────────────────────
  const historyDates: string[] = []
  for (let d = parseISO(seriesStart); toDay(d) <= today; d = addDays(d, 1)) historyDates.push(toDay(d))

  const history_: CashStoryPoint[] = historyDates.map((date) => {
    const f = flows.get(date)
    return { date, balance: 0, inflow: f?.inflow ?? 0, outflow: f?.outflow ?? 0, isForecast: false }
  })

  if (mode === "balance") {
    let balance = forecast.startBalance
    for (let i = history_.length - 1; i >= 0; i--) {
      history_[i]!.balance = balance
      balance -= history_[i]!.inflow - history_[i]!.outflow
    }
  } else {
    let balance = 0
    for (const p of history_) {
      balance += p.inflow - p.outflow
      p.balance = balance
    }
  }

  const todayIndex = history_.length - 1
  const todayBalance = history_[todayIndex]?.balance ?? forecast.startBalance
  const offset = mode === "net" ? todayBalance : 0

  // ── Forecast series (after today) ─────────────────────────────────────────
  // forecast.days[0] is today, whose balance already includes anything
  // expected today (e.g. past-due bills). Today's point stays the ACTUAL
  // balance; today's expected flows are shown on tomorrow's point.
  const future: CashStoryPoint[] = []
  const fdays = forecast.days
  for (let i = 1; i < fdays.length; i++) {
    const d = fdays[i]!
    const carry = i === 1 ? fdays[0]! : null
    future.push({
      date: d.date,
      balance: d.balance + offset,
      inflow: d.inflow + (carry?.inflow ?? 0),
      outflow: d.outflow + (carry?.outflow ?? 0),
      isForecast: true,
    })
  }

  const points = [...history_, ...future]

  // ── Stats over today → horizon ────────────────────────────────────────────
  let lowest = { date: today, balance: todayBalance }
  for (const p of future) if (p.balance < lowest.balance) lowest = { date: p.date, balance: p.balance }

  // ── Moments ───────────────────────────────────────────────────────────────
  const candidates: CashMoment[] = []

  if (lowest.date !== today) {
    candidates.push({ id: "low-point", kind: "low_point", date: lowest.date, title: "Lowest point", amount: lowest.balance })
  }

  let bigIn: { date: string; flow: DayFlow } | null = null
  let bigOut: { date: string; flow: DayFlow } | null = null
  for (const date of historyDates) {
    const f = flows.get(date)
    if (!f) continue
    if (f.inflow > 0 && (!bigIn || f.inflow > bigIn.flow.inflow)) bigIn = { date, flow: f }
    if (f.outflow > 0 && (!bigOut || f.outflow > bigOut.flow.outflow)) bigOut = { date, flow: f }
  }
  if (bigIn?.flow.topIn) {
    const t = bigIn.flow.topIn
    const named = t.who && t.amount >= bigIn.flow.inflow * 0.6
    candidates.push({
      id: "big-in",
      kind: "big_in",
      date: bigIn.date,
      title: named ? `${t.who} paid` : "Biggest day in",
      amount: bigIn.flow.inflow,
    })
  }

  const expectedIn = forecast.events
    .filter((e) => e.kind === "invoice")
    .reduce<(typeof forecast.events)[number] | null>((best, e) => (!best || e.amount > best.amount ? e : best), null)
  if (expectedIn) {
    candidates.push({
      id: "expected-in",
      kind: "expected_in",
      date: expectedIn.date <= today ? toDay(addDays(day0, 1)) : expectedIn.date,
      title: `${expectedIn.label} expected`,
      amount: expectedIn.amount,
      href: expectedIn.href,
    })
  }

  if (bigOut?.flow.topOut) {
    const t = bigOut.flow.topOut
    const named = t.who && t.amount >= bigOut.flow.outflow * 0.6
    candidates.push({
      id: "big-out",
      kind: "big_out",
      date: bigOut.date,
      title: named ? t.who : "Biggest day out",
      amount: -bigOut.flow.outflow,
    })
  }

  const expectedOut = forecast.events
    .filter((e) => e.direction === "out")
    .reduce<(typeof forecast.events)[number] | null>((best, e) => (!best || e.amount > best.amount ? e : best), null)
  if (expectedOut) {
    candidates.push({
      id: "expected-out",
      kind: "expected_out",
      date: expectedOut.date <= today ? toDay(addDays(day0, 1)) : expectedOut.date,
      title: expectedOut.label,
      amount: -expectedOut.amount,
      href: expectedOut.href,
    })
  }

  // Candidates are in priority order; drop any that would crowd a kept one.
  const moments: CashMoment[] = []
  const firstDate = points[0]?.date ?? today
  const lastDate = points[points.length - 1]?.date ?? today
  for (const m of candidates) {
    if (m.date < firstDate || m.date > lastDate) continue
    const crowded = moments.some(
      (k) => Math.abs(differenceInCalendarDays(parseISO(k.date), parseISO(m.date))) < MOMENT_MIN_GAP_DAYS
    )
    if (crowded) continue
    moments.push(m)
    if (moments.length >= MAX_MOMENTS) break
  }
  moments.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  return {
    today,
    mode,
    points,
    todayIndex,
    historyStart: seriesStart,
    todayBalance,
    moments,
    stats: {
      lowest,
      lowestIsToday: lowest.date === today,
      expectedIn: forecast.totals.inflow,
      expectedOut: forecast.totals.outflow,
      horizonDays: forecast.horizonDays,
    },
  }
}
