import { curveLinear } from "d3-shape"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { parseISO } from "date-fns"
import { ProfitIcon } from "@travada-books/ui/icons"
import { LineChart } from "@/components/charts/line-chart"
import { Line } from "@/components/charts/line"
import { LineChartLoading } from "@/components/charts/line-chart-loading"
import { ProfitLossLine, profitLossColor } from "@/components/charts/profit-loss-line"
import { ProfitLossLegend } from "@/components/charts/profit-loss-legend"
import { ProfitLossLegendHoverProvider } from "@/components/charts/profit-loss-legend-hover"
import { Grid } from "@/components/charts/grid"
import { XAxis } from "@/components/charts/x-axis"
import { YAxis } from "@/components/charts/y-axis"
import { ChartTooltip } from "@/components/charts/tooltip"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { getCashFlow } from "@/lib/queries/metrics"
import { formatCurrency, formatCurrencyCompact } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000
const MARGIN = { top: 24, right: 16, bottom: 32, left: 68 }
const TITLE = "Profit & Loss"

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
  const [hoveredLegend, setHoveredLegend] = useState<number | null>(null)

  // Reuses Cash Flow's exact query key so TanStack dedupes the network call —
  // this chart is entirely derived client-side from the same series.
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_cash_flow", from, to],
    queryFn: () => getCashFlow(orgId, from, to),
    staleTime: STALE_TIME,
  })

  const { chartData, totalNet, profitMonths } = useMemo(() => {
    const chartData = (data ?? []).map((m) => ({
      date: parseISO(m.month),
      income: m.income * fxRate,
      expense: m.expense * fxRate,
      net: m.net * fxRate,
    }))
    return {
      chartData,
      totalNet: chartData.reduce((sum, m) => sum + m.net, 0),
      profitMonths: chartData.filter((m) => m.net > 0).length,
    }
  }, [data, fxRate])

  if (isError) return <ChartCardError title={TITLE} icon={ProfitIcon} onRetry={() => refetch()} />

  return (
    <ChartCard title={TITLE} icon={ProfitIcon} description="Net profit each month — above the line is profit, below is loss">
      {isLoading ? (
        <LineChartLoading aspectRatio="2 / 1" margin={MARGIN} />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Net{" "}
            <span className="font-medium tabular-nums" style={{ color: profitLossColor(totalNet) }}>
              {formatCurrency(totalNet, displayCurrency)}
            </span>{" "}
            over the range · {profitMonths} of {chartData.length} {chartData.length === 1 ? "month" : "months"} in profit
          </p>
          <ProfitLossLegendHoverProvider hoveredIndex={hoveredLegend}>
            <LineChart data={chartData} xDataKey="date" aspectRatio="2 / 1" margin={MARGIN}>
              <Grid horizontal highlightRowValues={[0]} />
              {/* Invisible series that drives the y-domain — ProfitLossLine opts out
                  of domain registration by design (Bklit's documented pairing). */}
              <Line
                curve={curveLinear}
                dataKey="net"
                fadeEdges={false}
                showHighlight={false}
                stroke="transparent"
                strokeWidth={0}
              />
              <ProfitLossLine dataKey="net" />
              <XAxis />
              <YAxis formatValue={(v) => formatCurrencyCompact(v, displayCurrency)} />
              <ChartTooltip
                dotColor={(point) => profitLossColor((point.net as number) ?? 0)}
                rows={(point) => [
                  {
                    color: "var(--chart-2)",
                    label: "Income",
                    value: formatCurrency((point.income as number) ?? 0, displayCurrency),
                  },
                  {
                    color: "var(--chart-5)",
                    label: "Expenses",
                    value: formatCurrency((point.expense as number) ?? 0, displayCurrency),
                  },
                  {
                    color: profitLossColor((point.net as number) ?? 0),
                    label: ((point.net as number) ?? 0) >= 0 ? "Net profit" : "Net loss",
                    value: formatCurrency((point.net as number) ?? 0, displayCurrency),
                  },
                ]}
              />
            </LineChart>
          </ProfitLossLegendHoverProvider>
          <ProfitLossLegend hoveredIndex={hoveredLegend} onHoverChange={setHoveredLegend} />
        </div>
      )}
    </ChartCard>
  )
}
