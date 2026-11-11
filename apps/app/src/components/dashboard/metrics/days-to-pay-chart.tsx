import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { parseISO } from "date-fns"
import { Timer01Icon } from "@travada-books/ui/icons"
import { LineChart } from "@/components/charts/line-chart"
import { LineChartLoading } from "@/components/charts/line-chart-loading"
import { Line } from "@/components/charts/line"
import { Grid } from "@/components/charts/grid"
import { XAxis } from "@/components/charts/x-axis"
import { YAxis } from "@/components/charts/y-axis"
import { ChartTooltip } from "@/components/charts/tooltip"
import { chartCssVars } from "@/components/charts/chart-context"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getDaysToPay } from "@/lib/queries/metrics-extended"

const STALE_TIME = 2 * 60 * 1000
const MARGIN = { top: 24, right: 16, bottom: 32, left: 40 }
const TITLE = "Days to Get Paid"
const LATE_COLOR = "var(--chart-5)"

type DaysToPayChartProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Unused — day counts are not a currency figure. Kept for prop-shape consistency. */
  displayCurrency?: string
  /** Unused — day counts are not a currency figure. Kept for prop-shape consistency. */
  fxRate?: number
}

const days = (n: number) => `${Math.round(n)} day${Math.round(n) === 1 ? "" : "s"}`

export function DaysToPayChart({ orgId, from, to }: DaysToPayChartProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "days_to_pay", from, to],
    queryFn: () => getDaysToPay(orgId, from, to),
    staleTime: STALE_TIME,
  })

  const chartData = useMemo(
    () =>
      (data ?? []).map((m) => ({
        date: parseISO(m.month),
        avgDaysToPay: m.avgDaysToPay,
        avgDaysLate: m.avgDaysLate,
        count: m.count,
      })),
    [data],
  )

  const overall = useMemo(() => {
    const months = data ?? []
    const count = months.reduce((s, m) => s + m.count, 0)
    if (count === 0) return null
    return {
      count,
      avgDaysToPay: months.reduce((s, m) => s + m.avgDaysToPay * m.count, 0) / count,
      avgDaysLate: months.reduce((s, m) => s + m.avgDaysLate * m.count, 0) / count,
    }
  }, [data])

  if (isError) return <ChartCardError title={TITLE} icon={Timer01Icon} onRetry={() => refetch()} />

  if (!isLoading && !overall) {
    return (
      <ChartCard title={TITLE} icon={Timer01Icon}>
        <EmptyState icon={Timer01Icon} title="No invoices paid in this period" compact />
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title={TITLE}
      icon={Timer01Icon}
      description="Average days from issue to payment, and days past the due date, by month paid"
    >
      {isLoading || !overall ? (
        <LineChartLoading aspectRatio="2 / 1" margin={MARGIN} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-semibold tabular-nums">{days(overall.avgDaysToPay)}</span>
            <span className="text-xs text-muted-foreground">
              on average · {days(overall.avgDaysLate)} late · {overall.count} paid invoice
              {overall.count === 1 ? "" : "s"}
            </span>
          </div>
          <LineChart data={chartData} xDataKey="date" aspectRatio="2 / 1" margin={MARGIN}>
            <Grid horizontal />
            <Line dataKey="avgDaysToPay" stroke={chartCssVars.linePrimary} strokeWidth={2.5} showMarkers />
            <Line dataKey="avgDaysLate" stroke={LATE_COLOR} strokeWidth={2} showMarkers />
            <XAxis />
            <YAxis formatValue={(v) => `${Math.round(v)}d`} />
            <ChartTooltip
              rows={(point) => [
                {
                  color: chartCssVars.linePrimary,
                  label: "Days to pay",
                  value: days((point.avgDaysToPay as number) ?? 0),
                },
                {
                  color: LATE_COLOR,
                  label: "Days late",
                  value: days((point.avgDaysLate as number) ?? 0),
                },
                {
                  color: "transparent",
                  label: "Invoices paid",
                  value: String((point.count as number) ?? 0),
                },
              ]}
            />
          </LineChart>
        </div>
      )}
    </ChartCard>
  )
}
