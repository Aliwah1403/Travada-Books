import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { parseISO } from "date-fns"
import { ReceiptTextIcon } from "@travada-books/ui/icons"
import { BarChart } from "@/components/charts/bar-chart"
import { BarChartLoading } from "@/components/charts/bar-chart-loading"
import { Bar } from "@/components/charts/bar"
import { Grid } from "@/components/charts/grid"
import { XAxis } from "@/components/charts/x-axis"
import { YAxis } from "@/components/charts/y-axis"
import { ChartTooltip } from "@/components/charts/tooltip"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { getCashFlow } from "@/lib/queries/metrics"
import { formatCurrency, formatCurrencyCompact } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000
const MARGIN = { top: 24, right: 16, bottom: 32, left: 56 }

type ExpensesChartProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Currency to format/plot in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function ExpensesChart({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: ExpensesChartProps) {
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
        expense: m.expense * fxRate,
      })),
    [data, fxRate]
  )

  if (isError) return <ChartCardError title="Expenses" icon={ReceiptTextIcon} onRetry={() => refetch()} />

  return (
    <ChartCard title="Expenses" icon={ReceiptTextIcon} description="Monthly expenses for the selected range">
      {isLoading ? (
        <BarChartLoading aspectRatio="3 / 1" margin={MARGIN} />
      ) : (
        <BarChart data={chartData} xDataKey="date" aspectRatio="3 / 1" margin={MARGIN} barGap={0.35}>
          <Grid horizontal />
          <Bar dataKey="expense" fill="var(--chart-5)" lineCap="round" />
          <XAxis />
          <YAxis formatValue={(v) => formatCurrencyCompact(v, displayCurrency)} />
          <ChartTooltip
            rows={(point) => [
              {
                color: "var(--chart-5)",
                label: "Expense",
                value: formatCurrency((point.expense as number) ?? 0, displayCurrency),
              },
            ]}
          />
        </BarChart>
      )}
    </ChartCard>
  )
}
