import { format, parseISO, subDays } from "date-fns"
import { formatCurrencyCompact } from "@/lib/format"
import { invoicesDrilldownUrl, transactionsDrilldownUrl } from "@/lib/drilldown"
import { getExpensesByCategory, type CategoryExpense } from "@/lib/queries/metrics"
import { bestAndSlowest, bucketLabel, type OverviewIncome } from "@/lib/queries/overview-story"
import type { CashForecast } from "@/lib/queries/forecast"
import type { Insight } from "@/lib/queries/insights"

// ─── Overview insight cards ─────────────────────────────────────────────────
//
// Cards for the Overview's Insights carousel. Stored weekly AI insights
// (worker-written, lib/queries/insights.ts) come first, newest first; then
// observations derived locally from numbers the page already has, so there
// are always a few cards even before the first weekly insight exists.

export type OverviewInsightCard = {
  id: string
  source: "ai" | "local"
  /** Small caption above the text — "Weekly insight · 3–9 Nov", "From your numbers". */
  eyebrow: string
  title: string
  text: string
  action?: { label: string; href: string }
  /** Stored weekly insight this card summarises — its full text opens in the weekly summary sheet. */
  insightId?: string
}

const MAX_AI_CARDS = 3
const MAX_CARDS = 7
/** Top customer share (of money in) that's worth a concentration warning. */
const CONCENTRATION_SHARE = 0.4
const NOTABLE_LATENESS_DAYS = 5
/** Category spend must grow this much (fraction) on the 30 days before… */
const SPIKE_GROWTH = 0.5
/** …and be at least this share of all spending in the last 30 days. */
const SPIKE_MIN_SHARE = 0.05

// ─── Expense category spike (last 30 days vs the 30 before) ─────────────────

export type ExpenseSpikeInput = {
  from: string
  to: string
  current: CategoryExpense[]
  previous: CategoryExpense[]
}

export const expenseSpikeQueryKey = (orgId: string, today: string) => ["overview-expense-spike", orgId, today] as const

export async function getExpenseSpikeInput(orgId: string, today: string): Promise<ExpenseSpikeInput> {
  const day = parseISO(today)
  const from = format(subDays(day, 29), "yyyy-MM-dd")
  const prevFrom = format(subDays(day, 59), "yyyy-MM-dd")
  const prevTo = format(subDays(day, 30), "yyyy-MM-dd")
  const [current, previous] = await Promise.all([
    getExpensesByCategory(orgId, from, today),
    getExpensesByCategory(orgId, prevFrom, prevTo),
  ])
  return { from, to: today, current, previous }
}

// ─── Composition (pure) ─────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
// Insight weeks are UTC date strings — label from the string, not a Date.
function weekLabel(start: string, end: string): string {
  const f = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`
  return `${f(start)} – ${f(end)}`
}

export type InsightOptions = { displayCurrency: string; fxRate: number }

export function composeOverviewInsights(
  input: {
    stored: Insight[]
    income: OverviewIncome | null
    forecast: CashForecast | null
    spike: ExpenseSpikeInput | null
  },
  options: InsightOptions
): OverviewInsightCard[] {
  const money = (base: number) => formatCurrencyCompact(base * options.fxRate, options.displayCurrency)
  const cards: OverviewInsightCard[] = []

  // 1. Stored weekly AI insights, newest first.
  for (const insight of input.stored.slice(0, MAX_AI_CARDS)) {
    const { title, summary } = insight.content ?? { title: "", summary: "" }
    if (!title && !summary) continue
    cards.push({
      id: `ai:${insight.id}`,
      source: "ai",
      eyebrow: `Weekly insight · ${weekLabel(insight.period_start, insight.period_end)}`,
      title: title || "This week",
      text: summary,
      insightId: insight.id,
    })
  }

  const local: OverviewInsightCard[] = []
  const eyebrow = "From your numbers"
  const { income, forecast, spike } = input

  // 2. Customer concentration risk.
  if (income && income.total > 0) {
    const top = income.customers[0]
    const share = top ? top.current / income.total : 0
    if (top && share >= CONCENTRATION_SHARE) {
      const pct = Math.round(share * 100)
      local.push({
        id: "concentration",
        source: "local",
        eyebrow,
        title: `${pct}% of your money in came from one customer`,
        text: `${top.name} paid ${money(top.current)} of the ${money(income.total)} you brought in. If they slowed down, you'd feel it — worth widening the base.`,
        action: { label: "View customer", href: `/customers/${top.customerId}` },
      })
    }
  }

  // 3. A slow payer with money due in the forecast window.
  if (forecast) {
    const byCustomer = new Map<string, { label: string; late: number; amount: number; href: string; n: number }>()
    for (const e of forecast.events) {
      if (e.kind !== "invoice" || (e.customerAvgDaysLate ?? 0) < NOTABLE_LATENESS_DAYS) continue
      const key = e.customerId ?? e.label
      const acc = byCustomer.get(key) ?? { label: e.label, late: e.customerAvgDaysLate ?? 0, amount: 0, href: e.href, n: 0 }
      acc.amount += e.amount
      acc.n += 1
      byCustomer.set(key, acc)
    }
    const slow = [...byCustomer.values()].sort((a, b) => b.amount * b.late - a.amount * a.late)[0]
    if (slow) {
      local.push({
        id: "slow-payer",
        source: "local",
        eyebrow,
        title: `${slow.label} usually pays ${slow.late} days late`,
        text: `They have ${money(slow.amount)} open with you. The forecast already expects it late — a nudge before the due date could bring it forward.`,
        action: {
          label: slow.n === 1 ? "View invoice" : "View invoices",
          href: slow.n === 1 ? slow.href : invoicesDrilldownUrl({ statuses: ["unpaid", "partially_paid", "overdue"] }),
        },
      })
    }
  }

  // 4. Expense category spike.
  if (spike) {
    const totalNow = spike.current.reduce((s, c) => s + c.total, 0)
    const prevBy = new Map(spike.previous.map((c) => [c.category_id ?? "__none", c.total]))
    const spikes = spike.current
      .filter((c) => c.category_id != null)
      .map((c) => {
        const before = prevBy.get(c.category_id ?? "__none") ?? 0
        return { c, before, growth: before > 0 ? (c.total - before) / before : 0 }
      })
      .filter((x) => x.before > 0 && x.growth >= SPIKE_GROWTH && totalNow > 0 && x.c.total / totalNow >= SPIKE_MIN_SHARE)
      .sort((a, b) => b.c.total - b.before - (a.c.total - a.before))
    const top = spikes[0]
    if (top) {
      const pct = Math.round(top.growth * 100)
      local.push({
        id: "expense-spike",
        source: "local",
        eyebrow,
        title: `${top.c.category_name} spending is up ${pct}%`,
        text: `${money(top.c.total)} in the last 30 days, against ${money(top.before)} in the 30 before.`,
        action: {
          label: "See the spending",
          href: transactionsDrilldownUrl({
            from: spike.from,
            to: spike.to,
            type: "expense",
            categoryIds: top.c.category_id ? [top.c.category_id] : undefined,
          }),
        },
      })
    }
  }

  // 5. Biggest mover among customers (up or down) vs the stretch before.
  if (income) {
    const mover = income.customers
      .filter((c) => c.previous > 0 || c.current > 0)
      .map((c) => ({ c, diff: c.current - c.previous }))
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0]
    if (mover && Math.abs(mover.diff) > 0 && Math.abs(mover.diff) >= income.total * 0.05) {
      const { c, diff } = mover
      const up = diff > 0
      local.push({
        id: "customer-mover",
        source: "local",
        eyebrow,
        title: up
          ? c.previous > 0
            ? `${c.name} paid ${money(diff)} more than before`
            : `${c.name} is new money this period`
          : `${c.name} paid ${money(-diff)} less than before`,
        text: up
          ? `${money(c.current)} this period${c.previous > 0 ? `, up from ${money(c.previous)}` : ""}.`
          : `${money(c.current)} this period, down from ${money(c.previous)}${c.current === 0 ? " — nothing yet" : ""}.`,
        action: { label: "View customer", href: `/customers/${c.customerId}` },
      })
    }
  }

  // 6. Best month / week in the range.
  if (income) {
    const bs = bestAndSlowest(income)
    if (bs) {
      const label = bucketLabel(bs.best, income.granularity)
      const capital = label.charAt(0).toUpperCase() + label.slice(1)
      local.push({
        id: "best-period",
        source: "local",
        eyebrow,
        title: `${capital} was your best ${income.granularity} in this range`,
        text: `${money(bs.best.amount)} came in — ${bs.slowest.amount > 0 ? `${Math.round(bs.best.amount / bs.slowest.amount)}× your slowest` : "your slowest brought in nothing"}.`,
        action: { label: "See the income", href: incomeHref(bs.best.start, income.granularity) },
      })
    }
  }

  // 7. Expected money in — a calm fallback so the carousel is never empty.
  if (forecast && forecast.totals.inflow > 0) {
    const invoices = forecast.events.filter((e) => e.kind === "invoice")
    local.push({
      id: "expected-in",
      source: "local",
      eyebrow,
      title: `${money(forecast.totals.inflow)} expected in over the next ${forecast.horizonDays} days`,
      text: `From ${invoices.length} open invoice${invoices.length === 1 ? "" : "s"}, placed on the day each customer usually pays.`,
      action: { label: "Open invoices", href: invoicesDrilldownUrl({ statuses: ["unpaid", "partially_paid", "overdue"] }) },
    })
  }

  return [...cards, ...local].slice(0, MAX_CARDS)
}

function incomeHref(start: string, granularity: OverviewIncome["granularity"]): string {
  const d = parseISO(start)
  const end =
    granularity === "month"
      ? format(new Date(d.getFullYear(), d.getMonth() + 1, 0), "yyyy-MM-dd")
      : format(subDays(d, -6), "yyyy-MM-dd")
  return transactionsDrilldownUrl({ from: start, to: end, type: "income" })
}
