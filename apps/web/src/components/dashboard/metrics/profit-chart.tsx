import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { parseISO } from "date-fns"
import { ProfitIcon } from "@travada-books/ui/icons"
import { ComposedChart } from "@/components/charts/composed-chart"
import { BarChartLoading } from "@/components/charts/bar-chart-loading"
import { SeriesBar } from "@/components/charts/series-bar"
import { Line } from "@/components/charts/line"
import { Grid } from "@/components/charts/grid"
import { XAxis } from "@/components/charts/x-axis"
import { YAxis } from "@/components/charts/y-axis"
import { ChartTooltip } from "@/components/charts/tooltip"
import { chartCssVars } from "@/components/charts/chart-context"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { getCashFlow } from "@/lib/queries/metrics"
import { formatCurrency, formatCurrencyCompact } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000
const MARGIN = { top: 24, right: 16, bottom: 32, left: 56 }

type ProfitChartProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Currency to format/plot in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function ProfitChart({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: ProfitChartProps) {
  // Reuses Cash Flow's exact query key so TanStack dedupes the network call —
  // this chart is entirely derived client-side from the same series.
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_cash_flow", from, to],
    queryFn: () => getCashFlow(orgId, from, to),
    staleTime: STALE_TIME,
  })

  const chartData = useMemo(
    () =>
      (data ?? []).map((m) => ({
        date: parseISO(m.month),
        income: m.income * fxRate,
        expense: m.expense * fxRate,
        net: m.net * fxRate,
      })),
    [data, fxRate]
  )

  if (isError) return <ChartCardError title="Profit & Loss" icon={ProfitIcon} onRetry={() => refetch()} />

  return (
    <ChartCard
      title="Profit & Loss"
      icon={ProfitIcon}
      description="Income and expenses per month, with net profit as a line"
    >
      {isLoading ? (
        <BarChartLoading aspectRatio="3 / 1" margin={MARGIN} />
      ) : (
        <ComposedChart data={chartData} xDataKey="date" aspectRatio="3 / 1" margin={MARGIN} barGap={4}>
          <Grid horizontal highlightRowValues={[0]} />
          <SeriesBar dataKey="income" fill="var(--chart-2)" radius={3} />
          <SeriesBar dataKey="expense" fill="var(--chart-5)" radius={3} />
          <Line dataKey="net" stroke={chartCssVars.linePrimary} strokeWidth={2.5} showMarkers />
          <XAxis />
          <YAxis formatValue={(v) => formatCurrencyCompact(v, displayCurrency)} />
          <ChartTooltip
            rows={(point) => [
              {
                color: "var(--chart-2)",
                label: "Income",
                value: formatCurrency((point.income as number) ?? 0, displayCurrency),
              },
              {
                color: "var(--chart-5)",
                label: "Expense",
                value: formatCurrency((point.expense as number) ?? 0, displayCurrency),
              },
              {
                color: chartCssVars.linePrimary,
                label: "Net profit",
                value: formatCurrency((point.net as number) ?? 0, displayCurrency),
              },
            ]}
          />
        </ComposedChart>
      )}
    </ChartCard>
  )
}
