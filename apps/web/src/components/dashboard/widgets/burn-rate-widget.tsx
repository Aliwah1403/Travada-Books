import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { parseISO } from "date-fns"
import NumberFlow from "@number-flow/react"
import { MoneyBag02Icon } from "@travada-books/ui/icons"
import {
  WidgetCard,
  WidgetError,
  WidgetHeadlineSkeleton,
  WidgetLineSkeleton,
  WidgetChartSkeleton,
} from "@/components/dashboard/widget-card"
import { BarChart } from "@/components/charts/bar-chart"
import { Bar } from "@/components/charts/bar"
import { chartCssVars } from "@/components/charts/chart-context"
import { getCashFlow } from "@/lib/queries/metrics"

const SPARKLINE_MARGIN = { top: 2, right: 2, bottom: 2, left: 2 }

const STALE_TIME = 2 * 60 * 1000

type BurnRateWidgetProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function BurnRateWidget({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: BurnRateWidgetProps) {
  // Reuses the Cash Flow query — same key means TanStack dedupes the network
  // call against the Burn Rate chart / Cash Flow / Profit & Loss / Monthly
  // Spending widgets; burn is derived client-side from the same series. Do
  // not use `getBurnRate` here, it's hard-coded to the last 3 full months
  // and ignores the filter range.
  const { data: months, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_cash_flow", from, to],
    queryFn: () => getCashFlow(orgId, from, to),
    staleTime: STALE_TIME,
  })

  // Burn is the positive/visible quantity here, so plot -net (spend, not net).
  // Hooks must run before any early return (see revenue-widget for the full note).
  const sparklineData = useMemo(
    () => (months ?? []).map((m) => ({ date: parseISO(m.month), burn: -m.net * fxRate })),
    [months, fxRate],
  )

  if (isLoading) {
    return (
      <WidgetCard title="Monthly Burn / Surplus" icon={MoneyBag02Icon}>
        <div className="flex flex-col gap-1">
          <WidgetHeadlineSkeleton />
          <WidgetLineSkeleton className="w-28" />
          <WidgetChartSkeleton className="mt-2" />
        </div>
      </WidgetCard>
    )
  }
  if (isError) return <WidgetError title="Monthly Burn / Surplus" icon={MoneyBag02Icon} onRetry={() => refetch()} />

  const monthList = months ?? []
  const avgMonthlyNet = monthList.length > 0 ? monthList.reduce((sum, m) => sum + m.net, 0) / monthList.length : 0
  const isBurning = avgMonthlyNet < 0
  // avg_monthly_net: positive = surplus, negative = burning.
  const figure = Math.abs(avgMonthlyNet) * fxRate
  const title = isBurning ? "Monthly Cash Burn" : "Monthly Surplus"
  const rangeLabel = `${monthList.length}-month average`

  return (
    <WidgetCard title={title} icon={MoneyBag02Icon}>
      <div className="flex flex-col gap-1">
        <NumberFlow
          value={figure}
          format={{ style: "currency", currency: displayCurrency }}
          locales="en-US"
          className={
            isBurning
              ? "text-xl font-semibold tracking-tight text-destructive"
              : "text-xl font-semibold tracking-tight text-green-600 dark:text-green-400"
          }
        />
        <p className="text-xs text-muted-foreground">{rangeLabel}</p>
        {sparklineData.length > 1 && (
          <BarChart data={sparklineData} xDataKey="date" margin={SPARKLINE_MARGIN} className="mt-2 h-10" barGap={0.3}>
            <Bar
              dataKey="burn"
              fill={isBurning ? "var(--destructive)" : chartCssVars.linePrimary}
              lineCap="round"
            />
          </BarChart>
        )}
      </div>
    </WidgetCard>
  )
}
