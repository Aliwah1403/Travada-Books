import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { formatCurrencyCompact } from "@/lib/format"
import { resolvePreviousPeriod } from "@/lib/metrics-range"
import { fetchTransactions, txBase, type TxRow } from "@/lib/queries/metrics-extended"
import type { CashStory } from "@/lib/queries/cash-story"

// ─── Overview story ─────────────────────────────────────────────────────────
//
// The Overview tab's lede: two or three plain sentences about the selected
// range, numbers inline. Built from:
//   • money in for the range vs the same-length stretch before it (income
//     transactions, base_amount ?? amount — the same basis as the Revenue
//     chart and getCustomerConcentration),
//   • the top customers behind it,
//   • the best / slowest month (or week, for short ranges),
//   • one forward-looking clause from the cash story (forecast).
//
// When the range runs past today (e.g. "This month" ends on the 30th) only the
// days up to today count, and the comparison window is cut to the same number
// of days — "so far" vs "the same stretch last time", never a partial month
// against a full one.

const ISO = "yyyy-MM-dd"
/** Ranges up to this many days are bucketed by week, longer ones by month. */
const WEEKLY_MAX_DAYS = 62

// ─── Income data ────────────────────────────────────────────────────────────

export type IncomeCustomer = {
  customerId: string
  name: string
  current: number
  previous: number
}

export type IncomeBucket = {
  /** First day of the bucket, yyyy-MM-dd. */
  start: string
  amount: number
  /** Bucket only partly inside the range — not ranked as best/slowest. */
  partial: boolean
}

export type OverviewIncome = {
  from: string
  /** Last day counted — min(range end, today). */
  to: string
  prevFrom: string
  prevTo: string
  /** True when the range ends after today and was cut back to today. */
  clipped: boolean
  total: number
  previousTotal: number
  /** Sorted by current amount, descending. Customers with only previous income are included. */
  customers: IncomeCustomer[]
  unattributed: { current: number; previous: number }
  granularity: "month" | "week"
  buckets: IncomeBucket[]
}

export const overviewIncomeQueryKey = (orgId: string, from: string, to: string, today: string) =>
  ["overview-income", orgId, from, to, today] as const

type IncomeRow = TxRow & {
  customer: { name: string | null } | null
  invoice: { customer_id: string | null; customer_name: string | null } | null
}

export async function getOverviewIncome(orgId: string, from: string, to: string, today: string): Promise<OverviewIncome> {
  const clipped = to > today && from <= today
  const effTo = clipped ? today : to
  const prev = resolvePreviousPeriod(from, to)
  const prevTo = clipped
    ? format(addDays(parseISO(prev.from), differenceInCalendarDays(parseISO(effTo), parseISO(from))), ISO)
    : prev.to

  const rows = (await fetchTransactions(
    orgId,
    prev.from,
    effTo,
    "date, amount, base_amount, customer_id, customer:customers(name), invoice:invoices(customer_id, customer_name)",
    "income"
  )) as unknown as IncomeRow[]

  return summariseIncome(rows, { from, to: effTo, prevFrom: prev.from, prevTo, clipped })
}

/** Pure — splits income rows into the current and previous windows. */
export function summariseIncome(
  rows: IncomeRow[],
  range: { from: string; to: string; prevFrom: string; prevTo: string; clipped: boolean }
): OverviewIncome {
  const { from, to, prevFrom, prevTo } = range
  const lengthDays = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1
  const granularity: OverviewIncome["granularity"] = lengthDays <= WEEKLY_MAX_DAYS ? "week" : "month"
  const bucketStart = (date: string) =>
    granularity === "month"
      ? format(startOfMonth(parseISO(date)), ISO)
      : format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), ISO)

  // Zero-filled buckets across [from, to].
  const buckets = new Map<string, IncomeBucket>()
  for (let d = parseISO(from); format(d, ISO) <= to; d = addDays(d, 1)) {
    const key = bucketStart(format(d, ISO))
    if (!buckets.has(key)) buckets.set(key, { start: key, amount: 0, partial: false })
  }
  for (const b of buckets.values()) {
    const start = parseISO(b.start)
    const end = granularity === "month" ? endOfMonth(start) : addDays(start, 6)
    b.partial = b.start < from || format(end, ISO) > to
  }

  const customers = new Map<string, IncomeCustomer>()
  const unattributed = { current: 0, previous: 0 }
  let total = 0
  let previousTotal = 0

  for (const row of rows) {
    const date = row.date.slice(0, 10)
    const inCurrent = date >= from && date <= to
    const inPrevious = date >= prevFrom && date <= prevTo
    if (!inCurrent && !inPrevious) continue
    const value = txBase(row)
    if (inCurrent) {
      total += value
      const bucket = buckets.get(bucketStart(date))
      if (bucket) bucket.amount += value
    } else {
      previousTotal += value
    }

    const customerId = row.customer_id ?? row.invoice?.customer_id ?? null
    if (!customerId) {
      if (inCurrent) unattributed.current += value
      else unattributed.previous += value
      continue
    }
    const c =
      customers.get(customerId) ??
      ({
        customerId,
        name: row.customer?.name ?? row.invoice?.customer_name ?? "Unnamed customer",
        current: 0,
        previous: 0,
      } satisfies IncomeCustomer)
    if (inCurrent) c.current += value
    else c.previous += value
    customers.set(customerId, c)
  }

  return {
    ...range,
    total,
    previousTotal,
    customers: [...customers.values()].sort((a, b) => b.current - a.current || b.previous - a.previous),
    unattributed,
    granularity,
    buckets: [...buckets.values()].sort((a, b) => (a.start < b.start ? -1 : 1)),
  }
}

/** Best and slowest complete buckets (falls back to partial ones when there are no complete ones). */
export function bestAndSlowest(income: OverviewIncome): { best: IncomeBucket; slowest: IncomeBucket } | null {
  const complete = income.buckets.filter((b) => !b.partial)
  const pool = complete.length >= 2 ? complete : []
  if (pool.length < 2) return null
  let best = pool[0]!
  let slowest = pool[0]!
  for (const b of pool) {
    if (b.amount > best.amount) best = b
    if (b.amount < slowest.amount) slowest = b
  }
  if (best.amount <= 0 || best.start === slowest.start || best.amount === slowest.amount) return null
  return { best, slowest }
}

export function bucketLabel(bucket: IncomeBucket, granularity: OverviewIncome["granularity"], withYear = false): string {
  const d = parseISO(bucket.start)
  if (granularity === "month") return format(d, withYear ? "MMMM yyyy" : "MMMM")
  return `the week of ${format(d, "d MMM")}`
}

// ─── Story contract ─────────────────────────────────────────────────────────

export type StoryTone = "positive" | "negative" | "strong"

/** Plain text, or an emphasised fragment (numbers, names). */
export type StoryPart = string | { text: string; tone: StoryTone; href?: string }

export type OverviewStory = {
  source: "assistant" | "local"
  sentences: StoryPart[][]
}

export type StoryOptions = { displayCurrency: string; fxRate: number }

export async function getOverviewStory(
  orgId: string,
  income: OverviewIncome,
  cash: CashStory | null,
  options: StoryOptions
): Promise<OverviewStory> {
  // TODO(assistant): replace this local composition with the assistant's
  // written summary for the range (same `OverviewStory` shape, source
  // "assistant"). Keep composeOverviewStory as the fallback when the call
  // fails or the assistant is flagged off, so the lede never goes blank.
  void orgId
  return composeOverviewStory(income, cash, options)
}

// ─── Local composition (pure) ───────────────────────────────────────────────

const strong = (text: string, href?: string): StoryPart => ({ text, tone: "strong", href })

function rangePhrase(income: OverviewIncome): string {
  const from = parseISO(income.from)
  const to = parseISO(income.to)
  const sameYear = from.getFullYear() === to.getFullYear()
  if (income.clipped) {
    if (income.from === format(startOfMonth(to), ISO)) return "so far this month"
    if (income.from === `${to.getFullYear()}-01-01`) return "so far this year"
    return `since ${format(from, sameYear ? "d MMM" : "d MMM yyyy")}`
  }
  return `between ${format(from, sameYear ? "d MMM" : "d MMM yyyy")} and ${format(to, "d MMM yyyy")}`
}

export function composeOverviewStory(income: OverviewIncome, cash: CashStory | null, options: StoryOptions): OverviewStory {
  const money = (base: number) => formatCurrencyCompact(base * options.fxRate, options.displayCurrency)
  const sentences: StoryPart[][] = []

  // 1. Money in, the change, and who led it.
  const { total, previousTotal } = income
  const s1: StoryPart[] = []
  if (total <= 0) {
    s1.push(`No money has come in ${rangePhrase(income)}`)
    if (previousTotal > 0) s1.push(", against ", strong(money(previousTotal)), " in the stretch before")
    s1.push(".")
  } else {
    s1.push("You brought in ", strong(money(total)), ` ${rangePhrase(income)}`)
    if (previousTotal > 0) {
      const diff = total - previousTotal
      const pct = Math.round((diff / previousTotal) * 100)
      if (Math.abs(pct) < 1) {
        s1.push(", about the same as the stretch before")
      } else if (pct >= 200) {
        // A percentage on a tiny base reads as noise ("up 2509%"); say what it grew from.
        s1.push(", ", { text: `up from ${money(previousTotal)}`, tone: "positive" }, " in the stretch before")
      } else {
        s1.push(", ", {
          text: `${diff > 0 ? "up" : "down"} ${money(Math.abs(diff))} (${Math.abs(pct)}%)`,
          tone: diff > 0 ? "positive" : "negative",
        })
        s1.push(" on the stretch before")
      }
    }
    const top = income.customers[0]
    if (top && top.current > 0) {
      const share = Math.round((top.current / total) * 100)
      s1.push(" — led by ", strong(top.name, `/customers/${top.customerId}`))
      if (share >= 20 && income.customers.length > 1) s1.push(` (${share}%)`)
    }
    s1.push(".")
  }
  sentences.push(s1)

  // 2. Best and slowest month / week.
  const bs = bestAndSlowest(income)
  if (bs) {
    const unit = income.granularity === "month" ? "month" : "week"
    const multiYear = income.from.slice(0, 4) !== income.to.slice(0, 4)
    sentences.push([
      `Your best ${unit} was `,
      strong(bucketLabel(bs.best, income.granularity, multiYear)),
      ` at ${money(bs.best.amount)}`,
      ...(bs.slowest.amount > 0
        ? ["; the slowest was ", strong(bucketLabel(bs.slowest, income.granularity, multiYear)), ` at ${money(bs.slowest.amount)}.`]
        : ["; nothing came in during ", strong(bucketLabel(bs.slowest, income.granularity, multiYear)), "."]),
    ])
  }

  // 3. One forward-looking clause from the forecast.
  if (cash) {
    const { lowest, lowestIsToday, horizonDays, expectedIn, expectedOut } = cash.stats
    if (cash.mode === "balance") {
      if (lowestIsToday) {
        sentences.push([
          `Over the next ${horizonDays} days your balance stays above `,
          { text: money(lowest.balance), tone: lowest.balance < 0 ? "negative" : "strong" },
          ".",
        ])
      } else {
        const last = cash.points[cash.points.length - 1]
        const recovers = last != null && last.balance > lowest.balance
        sentences.push([
          "Looking ahead, your balance dips to ",
          { text: money(lowest.balance), tone: lowest.balance < 0 ? "negative" : "strong" },
          " on ",
          strong(format(parseISO(lowest.date), "d MMM")),
          recovers ? " before recovering." : ".",
        ])
      }
    } else if (expectedIn > 0 || expectedOut > 0) {
      sentences.push([
        `Over the next ${horizonDays} days you're expecting `,
        { text: money(expectedIn), tone: "positive" },
        " in and ",
        strong(money(expectedOut)),
        " out.",
      ])
    }
  }

  return { source: "local", sentences }
}
