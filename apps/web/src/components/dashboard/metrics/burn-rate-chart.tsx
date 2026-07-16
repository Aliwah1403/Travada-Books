import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { parseISO } from "date-fns"
import { MoneyBag02Icon } from "@travada-books/ui/icons"
import { LineChart } from "@/components/charts/line-chart"
import { LineChartLoading } from "@/components/charts/line-chart-loading"
import { Line } from "@/components/charts/line"
import { Grid } from "@/components/charts/grid"
import { XAxis } from "@/components/charts/x-axis"
import { YAxis } from "@/components/charts/y-axis"
import { ChartTooltip } from "@/components/charts/tooltip"
import { chartCssVars } from "@/components/charts/chart-context"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { getCashFlow, type CashFlowMonth } from "@/lib/queries/metrics"
import { formatCurrency, formatCurrencyCompact } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000
const MARGIN = { top: 24, right: 16, bottom: 32, left: 56 }
const ROLLING_WINDOW = 3

type BurnRateChartProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Currency to format/plot in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

/** Monthly burn = -net. Positive = burning cash, negative = a surplus month. */
function toBurnSeries(months: CashFlowMonth[], fxRate: number) {
  return months.map((m, i) => {
    const windowStart = Math.max(0, i - (ROLLING_WINDOW - 1))
    const window = months.slice(windowStart, i + 1)
    const rollingAvgBurn = (window.reduce((sum, w) => sum + -w.net, 0) / window.length) * fxRate
    return {
      date: parseISO(m.month),
      burn: -m.net * fxRate,
      rollingAvgBurn,
    }
  })
}

export function BurnRateChart({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: BurnRateChartProps) {
  // Reuses the Cash Flow query — same key means TanStack dedupes the network
  // call automatically; burn rate is entirely derived client-side from the
  // same series. Do not use `getBurnRate` here, it's hard-coded to the last
  // 3 full months and ignores the filter range.
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_cash_flow", from, to],
    queryFn: () => getCashFlow(orgId, from, to),
    staleTime: STALE_TIME,
  })

  const chartData = useMemo(() => toBurnSeries(data ?? [], fxRate), [data, fxRate])

  if (isError) return <ChartCardError title="Burn Rate" icon={MoneyBag02Icon} onRetry={() => refetch()} />

  return (
    <ChartCard
      title="Burn Rate"
      icon={MoneyBag02Icon}
      description="Positive = burning cash that month · negative = a surplus month, with a 3-month rolling average"
    >
      {isLoading ? (
        <LineChartLoading aspectRatio="3 / 1" margin={MARGIN} />
      ) : (
        <LineChart data={chartData} xDataKey="date" aspectRatio="3 / 1" margin={MARGIN}>
          <Grid horizontal highlightRowValues={[0]} />
          <Line dataKey="burn" stroke={chartCssVars.linePrimary} strokeWidth={2.5} showMarkers />
          <Line dataKey="rollingAvgBurn" stroke="var(--chart-3)" strokeWidth={2} />
          <XAxis />
          <YAxis formatValue={(v) => formatCurrencyCompact(v, displayCurrency)} />
          <ChartTooltip
            rows={(point) => [
              {
                color: chartCssVars.linePrimary,
                label: "Monthly burn",
                value: formatCurrency((point.burn as number) ?? 0, displayCurrency),
              },
              {
                color: "var(--chart-3)",
                label: "3-mo average",
                value: formatCurrency((point.rollingAvgBurn as number) ?? 0, displayCurrency),
              },
            ]}
          />
        </LineChart>
      )}
    </ChartCard>
  )
}
