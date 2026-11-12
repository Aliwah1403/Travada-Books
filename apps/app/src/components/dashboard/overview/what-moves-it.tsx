import { Link } from "react-router"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@travada-books/ui/components/card"
import { Button } from "@travada-books/ui/components/button"
import { UserStar01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { formatCurrencyCompact } from "@/lib/format"
import { localToday, type CashForecast } from "@/lib/queries/forecast"
import type { IncomeCustomer, OverviewIncome } from "@/lib/queries/overview-story"
import { useCashForecast } from "./use-cash-forecast"
import { useOverviewIncome } from "./use-overview-data"

const TOP_N = 4
const TITLE = "Where it came from"

type WhatMovesItProps = {
  orgId: string
  /** Org base currency. */
  currency: string
  from: string
  to: string
  displayCurrency: string
  fxRate: number
}

/** Ranked sources of money in for the range, then a compact "coming out" line. */
export function WhatMovesIt({ orgId, currency, from, to, displayCurrency, fxRate }: WhatMovesItProps) {
  const income = useOverviewIncome(orgId, from, to, localToday())
  const forecast = useCashForecast(orgId, currency)
  const fmt = (base: number) => formatCurrencyCompact(base * fxRate, displayCurrency)

  return (
    <Card className="h-full w-full">
      <CardHeader className="flex flex-row items-start gap-2 space-y-0">
        <UserStar01Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>{TITLE}</CardTitle>
          <CardDescription>Money in this period, by customer, against the stretch before</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {income.isError ? (
          <div className="flex items-center gap-3">
            <p className="flex-1 text-xs text-muted-foreground">Couldn't load your income.</p>
            <Button size="sm" variant="outline" onClick={() => income.refetch()}>
              Try again
            </Button>
          </div>
        ) : !income.data ? (
          <ul className="flex flex-col gap-4">
            {Array.from({ length: TOP_N }, (_, i) => (
              <li key={i} className="flex flex-col gap-2">
                <div className="flex justify-between gap-3">
                  <div className="h-3.5 w-28 animate-pulse rounded-md bg-muted" />
                  <div className="h-3.5 w-14 animate-pulse rounded-md bg-muted" />
                </div>
                <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
              </li>
            ))}
          </ul>
        ) : (
          <Sources income={income.data} fmt={fmt} />
        )}

        <ComingOut forecast={forecast.data ?? null} loading={forecast.isLoading} fmt={fmt} />
      </CardContent>
    </Card>
  )
}

function Sources({ income, fmt }: { income: OverviewIncome; fmt: (base: number) => string }) {
  const top = income.customers.filter((c) => c.current > 0).slice(0, TOP_N)
  if (income.total <= 0 || top.length === 0) {
    return <p className="text-xs text-muted-foreground">No customer payments in this period yet.</p>
  }
  // Shares are of customer-linked income, so a business that records most
  // payments without a customer still gets readable bars; the unlinked part
  // gets its own line instead of hiding inside "Everyone else".
  const linkedTotal = income.total - income.unattributed.current
  const shareBase = linkedTotal > 0 ? linkedTotal : income.total
  const rest = linkedTotal - top.reduce((s, c) => s + c.current, 0)
  const unlinked = income.unattributed.current

  return (
    <ol className="flex flex-col gap-1">
      {top.map((c, i) => (
        <li key={c.customerId}>
          <Link
            to={`/customers/${c.customerId}`}
            className="-mx-2 flex flex-col gap-1.5 rounded-md px-2 py-1.5 transition-colors fine-hover:bg-muted/60 active:opacity-80"
          >
            <div className="flex items-baseline gap-2">
              <span className="w-3 shrink-0 text-[0.6875rem] text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{c.name}</span>
              <span className="shrink-0 text-xs font-medium tabular-nums">{fmt(c.current)}</span>
            </div>
            <div className="flex items-center gap-2 pl-5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[var(--chart-line-primary)]"
                  style={{ width: `${Math.max(2, (c.current / shareBase) * 100)}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-[0.6875rem] text-muted-foreground tabular-nums">
                {Math.round((c.current / shareBase) * 100)}%
              </span>
              <Change customer={c} />
            </div>
          </Link>
        </li>
      ))}
      {rest > 0 && (
        <li className="flex items-baseline gap-2 py-1.5 text-xs text-muted-foreground">
          <span className="w-3 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Everyone else</span>
          <span className="shrink-0 tabular-nums">{fmt(rest)}</span>
        </li>
      )}
      {unlinked > 0 && (
        <li className="flex items-baseline gap-2 py-1.5 text-xs text-muted-foreground">
          <span className="w-3 shrink-0" />
          <Link
            to="/transactions"
            className="min-w-0 flex-1 truncate underline-offset-4 fine-hover:underline"
          >
            Not linked to a customer
          </Link>
          <span className="shrink-0 tabular-nums">{fmt(unlinked)}</span>
        </li>
      )}
    </ol>
  )
}

function Change({ customer }: { customer: IncomeCustomer }) {
  const { current, previous } = customer
  let text: string
  let tone = "text-muted-foreground"
  if (previous <= 0) {
    text = "New"
  } else {
    const pct = Math.round(((current - previous) / previous) * 100)
    if (pct === 0) text = "±0%"
    else {
      text = `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`
      tone = pct > 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
    }
  }
  return <span className={cn("w-11 shrink-0 text-right text-[0.6875rem] tabular-nums", tone)}>{text}</span>
}

function ComingOut({
  forecast,
  loading,
  fmt,
}: {
  forecast: CashForecast | null
  loading: boolean
  fmt: (base: number) => string
}) {
  if (loading) return <div className="mt-auto h-9 w-full animate-pulse rounded-md bg-muted" />
  if (!forecast) return null

  const out = forecast.events.filter((e) => e.direction === "out")
  const bills = out.filter((e) => e.kind === "bill").length
  const recurring = new Set(out.filter((e) => e.kind === "recurring_expense").map((e) => e.label.toLowerCase())).size
  const parts: string[] = []
  if (bills > 0) parts.push(`${bills} bill${bills === 1 ? "" : "s"}`)
  if (recurring > 0) parts.push(`${recurring} recurring cost${recurring === 1 ? "" : "s"}`)

  return (
    <Link
      to="/bills"
      className="mt-auto -mx-2 flex items-center gap-2 rounded-md border-t px-2 pt-3 pb-1 transition-colors fine-hover:bg-muted/60 active:opacity-80"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-medium">Coming out</span>
        <span className="truncate text-[0.6875rem] text-muted-foreground">
          Next {forecast.horizonDays} days{parts.length > 0 ? ` · ${parts.join(", ")}` : " · nothing scheduled"}
        </span>
      </div>
      <span className="shrink-0 text-xs font-medium tabular-nums">
        {forecast.totals.outflow > 0 ? `−${fmt(forecast.totals.outflow)}` : fmt(0)}
      </span>
    </Link>
  )
}
