import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns"
import { formatCurrencyCompact } from "@/lib/format"
import type { CashForecast, ForecastEvent } from "@/lib/queries/forecast"

// ─── Dashboard briefing contract ──────────────────────────────────────────────
//
// A handful of plain-language lines at the top of the Overview tab, each with
// a tone and (optionally) one action. The assistant will generate these; until
// its endpoint exists the app composes them locally from the cash forecast.
// Keep this shape stable — it's the contract the assistant API will return.

export type BriefingTone = "urgent" | "heads_up" | "good"

export type BriefingItem = {
  id: string
  tone: BriefingTone
  text: string
  /** `href` is an in-app path, or `#cash-calendar` to scroll to the forecast card. */
  action?: { label: string; href: string }
}

export type DashboardBriefing = {
  generatedAt: string
  source: "assistant" | "local"
  items: BriefingItem[]
}

export type BriefingOptions = {
  /** Currency to phrase amounts in (the dashboard's display currency). */
  displayCurrency: string
  /** Multiplier from base currency → display currency. */
  fxRate: number
}

export const briefingQueryKey = (orgId: string, displayCurrency: string, fxRate: number, forecastToday: string) =>
  ["dashboard-briefing", orgId, displayCurrency, fxRate, forecastToday] as const

const MAX_ITEMS = 4
const WEEK_DAYS = 7
/** A customer "usually pays late" worth mentioning from this many days. */
const NOTABLE_LATENESS_DAYS = 5
/** A dip below this share of today's balance earns a heads-up. */
const LOW_BALANCE_SHARE = 0.2

export const CASH_CALENDAR_ANCHOR = "#cash-calendar"

// ─── Fetch (assistant-ready) ────────────────────────────────────────────────

export async function getDashboardBriefing(
  orgId: string,
  forecast: CashForecast,
  options: BriefingOptions
): Promise<DashboardBriefing> {
  // TODO(assistant): replace this local composition with the assistant
  // endpoint (e.g. `api.v1.assistant.briefing.$get({ query: { orgId } })`),
  // which returns a `DashboardBriefing` with `source: "assistant"`. Keep
  // `composeLocalBriefing` as the fallback when the call fails or the
  // assistant is flagged off, so the strip never goes blank.
  void orgId
  return composeLocalBriefing(forecast, options)
}

// ─── Local composition (pure) ───────────────────────────────────────────────

const money = (amountBase: number, { displayCurrency, fxRate }: BriefingOptions) =>
  formatCurrencyCompact(amountBase * fxRate, displayCurrency)

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** "today", "tomorrow", "Friday" (within a week), else "28 Nov". */
function relativeDay(date: string, today: string): string {
  const diff = differenceInCalendarDays(parseISO(date), parseISO(today))
  if (diff === 0) return "today"
  if (diff === 1) return "tomorrow"
  if (diff > 1 && diff < WEEK_DAYS) return format(parseISO(date), "EEEE")
  return `on ${format(parseISO(date), "d MMM")}`
}

const sum = (events: ForecastEvent[]) => events.reduce((s, e) => s + e.amount, 0)

function invoiceListHref(filters: Array<Record<string, unknown>>): string {
  return `/invoices?filters=${encodeURIComponent(JSON.stringify(filters))}`
}

const RANK: Record<BriefingTone, number> = { urgent: 0, heads_up: 1, good: 2 }

export function composeLocalBriefing(forecast: CashForecast, options: BriefingOptions): DashboardBriefing {
  const { today, events } = forecast
  const weekEnd = format(addDays(parseISO(today), WEEK_DAYS - 1), "yyyy-MM-dd")
  const items: BriefingItem[] = []

  const invoices = events.filter((e) => e.kind === "invoice")
  const bills = events.filter((e) => e.kind === "bill")

  // 1. Overdue invoices — money already owed to you.
  const overdueInvoices = invoices.filter((e) => e.overdue)
  if (overdueInvoices.length > 0) {
    const n = overdueInvoices.length
    items.push({
      id: "overdue-invoices",
      tone: "urgent",
      text: `${plural(n, "invoice")} worth ${money(sum(overdueInvoices), options)} ${n === 1 ? "is" : "are"} overdue`,
      action: {
        label: "Send reminders",
        href: invoiceListHref([{ columnId: "status", type: "option", operator: "is", values: ["overdue"] }]),
      },
    })
  }

  // 2. Invoices falling due this week, with the slowest payer called out.
  const dueThisWeek = invoices.filter((e) => !e.overdue && e.dueDate != null && e.dueDate >= today && e.dueDate <= weekEnd)
  if (dueThisWeek.length > 0) {
    const n = dueThisWeek.length
    let text = `${plural(n, "invoice")} worth ${money(sum(dueThisWeek), options)} ${n === 1 ? "is" : "are"} due this week`
    const slowest = [...dueThisWeek]
      .filter((e) => (e.customerAvgDaysLate ?? 0) >= NOTABLE_LATENESS_DAYS)
      .sort((a, b) => (b.customerAvgDaysLate ?? 0) - (a.customerAvgDaysLate ?? 0))[0]
    if (slowest) text += ` — ${slowest.label} usually pays ${slowest.customerAvgDaysLate} days late`
    items.push({
      id: "invoices-due-this-week",
      tone: "heads_up",
      text,
      action: {
        label: "View invoices",
        href: invoiceListHref([
          { columnId: "dueDate", type: "date", operator: "is between", values: [today, weekEnd] },
          { columnId: "status", type: "option", operator: "is", values: ["unpaid", "partially_paid"] },
        ]),
      },
    })
  }

  // 3. Bills — past due (urgent) or due within the week (heads-up).
  const overdueBills = bills.filter((e) => e.overdue)
  const billsThisWeek = bills.filter((e) => !e.overdue && e.date <= weekEnd)
  for (const [group, tone, id] of [
    [overdueBills, "urgent", "overdue-bills"],
    [billsThisWeek, "heads_up", "bills-this-week"],
  ] as const) {
    if (group.length === 0) continue
    if (group.length === 1) {
      const bill = group[0]
      items.push({
        id,
        tone,
        text:
          tone === "urgent"
            ? `Bill from ${bill.label} for ${money(bill.amount, options)} is past due`
            : `Bill from ${bill.label} for ${money(bill.amount, options)} is due ${relativeDay(bill.date, today)}`,
        action: { label: "View bill", href: bill.href },
      })
    } else {
      items.push({
        id,
        tone,
        text: `${group.length} bills worth ${money(sum(group), options)} ${tone === "urgent" ? "are past due" : "are due this week"}`,
        action: { label: "View bills", href: "/bills" },
      })
    }
  }

  // 4. Projected balance — only meaningful with a real opening balance.
  const { lowest, startBalance, isConfigured } = forecast
  if (isConfigured) {
    if (lowest.balance < 0) {
      items.push({
        id: "balance-negative",
        tone: "urgent",
        text: `Your projected balance drops to ${money(lowest.balance, options)} ${relativeDay(lowest.date, today)}`,
        action: { label: "See forecast", href: CASH_CALENDAR_ANCHOR },
      })
    } else if (startBalance > 0 && lowest.balance < startBalance * LOW_BALANCE_SHARE) {
      items.push({
        id: "balance-dip",
        tone: "heads_up",
        text: `Your projected balance dips to ${money(lowest.balance, options)} ${relativeDay(lowest.date, today)}`,
        action: { label: "See forecast", href: CASH_CALENDAR_ANCHOR },
      })
    }
  }

  items.sort((a, b) => RANK[a.tone] - RANK[b.tone])
  const trimmed = items.slice(0, MAX_ITEMS)

  // 5. Nothing worth flagging — one calm line.
  if (trimmed.length === 0) {
    const expectedIn = forecast.totals.inflow
    let text: string
    if (isConfigured) {
      text = `Nothing overdue — your balance stays above ${money(Math.max(0, lowest.balance), options)} over the next ${forecast.horizonDays} days`
    } else if (expectedIn > 0) {
      text = `Nothing overdue — ${money(expectedIn, options)} expected in over the next ${forecast.horizonDays} days`
    } else {
      text = "Nothing overdue and no bills coming up"
    }
    trimmed.push({
      id: "all-clear",
      tone: "good",
      text,
      action: isConfigured
        ? { label: "See forecast", href: CASH_CALENDAR_ANCHOR }
        : { label: "Set opening balance", href: "/settings/general" },
    })
  }

  return { generatedAt: new Date().toISOString(), source: "local", items: trimmed }
}
