import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Globe02Icon } from "@travada-books/ui/icons"
import { BarChart } from "@/components/charts/bar-chart"
import { BarChartLoading } from "@/components/charts/bar-chart-loading"
import { Bar } from "@/components/charts/bar"
import { BarXAxis } from "@/components/charts/bar-x-axis"
import { Grid } from "@/components/charts/grid"
import { YAxis } from "@/components/charts/y-axis"
import { ChartTooltip } from "@/components/charts/tooltip"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getCurrencyExposure } from "@/lib/queries/metrics-extended"
import { formatCurrency, formatCurrencyCompact } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000
const MARGIN = { top: 24, right: 16, bottom: 32, left: 56 }
const TITLE = "Currency Exposure"
const INCOME_COLOR = "var(--chart-2)"
const EXPENSE_COLOR = "var(--chart-5)"

type CurrencyExposureChartProps = {
  orgId: string
  currency: string
  from: string
  to: string
  displayCurrency?: string
  fxRate?: number
}

// Income vs expenses grouped by each transaction's ORIGINAL currency, with
// the bar heights in base (or display) currency so they compare directly.
export function CurrencyExposureChart({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: CurrencyExposureChartProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "currency_exposure", from, to],
    queryFn: () => getCurrencyExposure(orgId, from, to),
    staleTime: STALE_TIME,
  })

  const chartData = useMemo(
    () =>
      (data ?? []).map((c) => ({
        name: c.currency,
        income: c.income * fxRate,
        expense: c.expense * fxRate,
      })),
    [data, fxRate],
  )

  if (isError) return <ChartCardError title={TITLE} icon={Globe02Icon} onRetry={() => refetch()} />

  if (!isLoading && chartData.length <= 1) {
    const only = chartData[0]?.name ?? currency
    return (
      <ChartCard title={TITLE} icon={Globe02Icon}>
        <EmptyState
          icon={Globe02Icon}
          title={chartData.length === 0 ? "No transactions in this period" : `All your money moves in ${only}`}
          description={chartData.length === 0 ? undefined : "No foreign-currency exposure in this range."}
          compact
        />
      </ChartCard>
    )
  }

  const total = chartData.reduce((s, c) => s + c.income + c.expense, 0)
  const foreign = chartData.filter((c) => c.name !== currency).reduce((s, c) => s + c.income + c.expense, 0)
  const foreignPct = total > 0 ? Math.round((foreign / total) * 100) : 0

  return (
    <ChartCard
      title={TITLE}
      icon={Globe02Icon}
      description={`Money in and out by original currency, valued in ${displayCurrency}`}
    >
      {isLoading ? (
        <BarChartLoading aspectRatio="2 / 1" margin={MARGIN} />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{foreignPct}%</span> of money moved was in a currency other
            than {currency}.
          </p>
          <BarChart data={chartData} xDataKey="name" aspectRatio="2 / 1" margin={MARGIN} barGap={0.3}>
            <Grid horizontal />
            <Bar dataKey="income" fill={INCOME_COLOR} lineCap={3} />
            <Bar dataKey="expense" fill={EXPENSE_COLOR} lineCap={3} />
            <BarXAxis showAllLabels />
            <YAxis formatValue={(v) => formatCurrencyCompact(v, displayCurrency)} />
            <ChartTooltip
              showDatePill={false}
              rows={(point) => [
                {
                  color: INCOME_COLOR,
                  label: `${point.name as string} income`,
                  value: formatCurrency((point.income as number) ?? 0, displayCurrency),
                },
                {
                  color: EXPENSE_COLOR,
                  label: `${point.name as string} expenses`,
                  value: formatCurrency((point.expense as number) ?? 0, displayCurrency),
                },
              ]}
            />
          </BarChart>
        </div>
      )}
    </ChartCard>
  )
}
