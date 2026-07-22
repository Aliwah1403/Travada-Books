import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { parseISO } from "date-fns"
import { MoneyBag02Icon } from "@travada-books/ui/icons"
import { WidgetCard, WidgetSkeleton, WidgetError } from "@/components/dashboard/widget-card"
import { BarChart } from "@/components/charts/bar-chart"
import { Bar } from "@/components/charts/bar"
import { chartCssVars } from "@/components/charts/chart-context"
import { getBurnRate } from "@/lib/queries/metrics"
import { formatCurrency } from "@/lib/format"

const SPARKLINE_MARGIN = { top: 2, right: 2, bottom: 2, left: 2 }

const STALE_TIME = 2 * 60 * 1000

type BurnRateWidgetProps = {
  orgId: string
  currency: string
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function BurnRateWidget({
  orgId,
  currency,
  displayCurrency = currency,
  fxRate = 1,
}: BurnRateWidgetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_burn_rate"],
    queryFn: () => getBurnRate(orgId),
    staleTime: STALE_TIME,
  })

  // Burn is the positive/visible quantity here, so plot -net (spend, not net).
  // Hooks must run before any early return (see revenue-widget for the full note).
  const sparklineData = useMemo(
    () => (data?.months ?? []).map((m) => ({ date: parseISO(m.month), burn: -m.net * fxRate })),
    [data, fxRate],
  )

  if (isLoading) return <WidgetSkeleton />
  if (isError) return <WidgetError title="Monthly Burn / Surplus" icon={MoneyBag02Icon} onRetry={() => refetch()} />

  const isBurning = data?.is_burning ?? false
  // avg_monthly_net: positive = surplus, negative = burning.
  const figure = Math.abs(data?.avg_monthly_net ?? 0) * fxRate
  const title = isBurning ? "Monthly Cash Burn" : "Monthly Surplus"

  return (
    <WidgetCard title={title} icon={MoneyBag02Icon}>
      <div className="flex flex-col gap-1">
        <p
          className={
            isBurning
              ? "text-xl font-semibold tracking-tight text-destructive"
              : "text-xl font-semibold tracking-tight text-green-600 dark:text-green-400"
          }
        >
          {formatCurrency(figure, displayCurrency)}
        </p>
        <p className="text-xs text-muted-foreground">3-month average</p>
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
