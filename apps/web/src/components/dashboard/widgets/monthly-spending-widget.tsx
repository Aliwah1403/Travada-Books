import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { parseISO } from "date-fns"
import { ReceiptTextIcon, ArrowUpRight01Icon, ArrowDownRight01Icon } from "@travada-books/ui/icons"
import { WidgetCard, WidgetSkeleton, WidgetError } from "@/components/dashboard/widget-card"
import { BarChart } from "@/components/charts/bar-chart"
import { Bar } from "@/components/charts/bar"
import { getCashFlow } from "@/lib/queries/metrics"
import { formatCurrency } from "@/lib/format"

const SPARKLINE_MARGIN = { top: 2, right: 2, bottom: 2, left: 2 }

const STALE_TIME = 2 * 60 * 1000

type MonthlySpendingWidgetProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function MonthlySpendingWidget({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: MonthlySpendingWidgetProps) {
  // Reuses Cash Flow's exact query key so TanStack dedupes the network call —
  // this widget is entirely derived client-side from the same series.
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_cash_flow", from, to],
    queryFn: () => getCashFlow(orgId, from, to),
    staleTime: STALE_TIME,
  })

  const months = data ?? []

  // Hooks must run before any early return (see revenue-widget for the full note).
  const sparklineData = useMemo(
    () => months.map((m) => ({ date: parseISO(m.month), expense: m.expense * fxRate })),
    [months, fxRate],
  )

  if (isLoading) return <WidgetSkeleton />
  if (isError) return <WidgetError title="Monthly Spending" icon={ReceiptTextIcon} onRetry={() => refetch()} />

  const thisMonth = months.at(-1)
  const lastMonth = months.at(-2)
  const thisExpense = (thisMonth?.expense ?? 0) * fxRate
  const lastExpense = (lastMonth?.expense ?? 0) * fxRate
  const delta = thisExpense - lastExpense
  // Spending going up is bad — invert the polarity vs a revenue-style widget.
  const isUp = delta > 0
  const isDown = delta < 0
  const TrendIcon = isUp ? ArrowUpRight01Icon : ArrowDownRight01Icon

  return (
    <WidgetCard title="Monthly Spending" icon={ReceiptTextIcon}>
      <div className="flex flex-col gap-1">
        <p className="text-xl font-semibold tracking-tight">{formatCurrency(thisExpense, displayCurrency)}</p>
        {/* No real "last month" in a single-month range — showing a delta
            against 0 would fabricate a misleading trend. */}
        {lastMonth && (
          <div
            className={
              isUp
                ? "flex items-center gap-1 text-xs text-destructive"
                : isDown
                  ? "flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
                  : "flex items-center gap-1 text-xs text-muted-foreground"
            }
          >
            {delta !== 0 && <TrendIcon size={12} className="shrink-0" />}
            <span>{formatCurrency(Math.abs(delta), displayCurrency)} vs last month</span>
          </div>
        )}
        {sparklineData.length > 1 && (
          <BarChart data={sparklineData} xDataKey="date" margin={SPARKLINE_MARGIN} className="mt-2 h-10" barGap={0.3}>
            <Bar dataKey="expense" fill="var(--destructive)" lineCap="round" />
          </BarChart>
        )}
      </div>
    </WidgetCard>
  )
}
