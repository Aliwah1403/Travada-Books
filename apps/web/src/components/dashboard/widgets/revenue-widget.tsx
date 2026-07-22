import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { parseISO } from "date-fns"
import { ChartLineData01Icon, ArrowUpRight01Icon, ArrowDownRight01Icon } from "@travada-books/ui/icons"
import { WidgetCard, WidgetSkeleton, WidgetError } from "@/components/dashboard/widget-card"
import { BarChart } from "@/components/charts/bar-chart"
import { Bar } from "@/components/charts/bar"
import { chartCssVars } from "@/components/charts/chart-context"
import { getRevenueSummary, type RevenueType } from "@/lib/queries/metrics"
import { formatCurrency } from "@/lib/format"

const SPARKLINE_MARGIN = { top: 2, right: 2, bottom: 2, left: 2 }

const STALE_TIME = 2 * 60 * 1000

type RevenueWidgetProps = {
  orgId: string
  currency: string
  from: string
  to: string
  revenueType: RevenueType
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function RevenueWidget({
  orgId,
  currency,
  from,
  to,
  revenueType,
  displayCurrency = currency,
  fxRate = 1,
}: RevenueWidgetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_revenue_summary", from, to, revenueType],
    queryFn: () => getRevenueSummary(orgId, from, to, revenueType),
    staleTime: STALE_TIME,
  })

  const months = data ?? []

  // Hooks must run before any early return — keep useMemo above the loading/error
  // guards so the hook count stays constant across renders. A conditional hook
  // throws "Rendered more hooks than during the previous render", which the
  // widget error boundary catches and shows as "widget couldn't load".
  const sparklineData = useMemo(
    () => months.map((m) => ({ date: parseISO(m.month), revenue: m.revenue * fxRate })),
    [months, fxRate],
  )

  if (isLoading) return <WidgetSkeleton />
  if (isError) return <WidgetError title="Revenue" icon={ChartLineData01Icon} onRetry={() => refetch()} />

  const thisMonth = months.at(-1)
  const lastMonth = months.at(-2)
  const thisRevenue = (thisMonth?.revenue ?? 0) * fxRate
  const lastRevenue = (lastMonth?.revenue ?? 0) * fxRate
  const delta = thisRevenue - lastRevenue
  const isUp = delta >= 0
  const TrendIcon = isUp ? ArrowUpRight01Icon : ArrowDownRight01Icon

  return (
    <WidgetCard title="Revenue" icon={ChartLineData01Icon}>
      <div className="flex flex-col gap-1">
        <p className="text-xl font-semibold tracking-tight">{formatCurrency(thisRevenue, displayCurrency)}</p>
        {/* No real "last month" in a single-month range (e.g. "This month")
            — showing a delta against 0 would fabricate a misleading trend. */}
        {lastMonth && (
          <div
            className={
              isUp
                ? "flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
                : "flex items-center gap-1 text-xs text-destructive"
            }
          >
            <TrendIcon size={12} className="shrink-0" />
            <span>
              {formatCurrency(Math.abs(delta), displayCurrency)} vs last month
            </span>
          </div>
        )}
        {sparklineData.length > 1 && (
          <BarChart data={sparklineData} xDataKey="date" margin={SPARKLINE_MARGIN} className="mt-2 h-10" barGap={0.3}>
            <Bar dataKey="revenue" fill={chartCssVars.linePrimary} lineCap="round" />
          </BarChart>
        )}
      </div>
    </WidgetCard>
  )
}
