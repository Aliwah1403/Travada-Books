import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, parseISO } from "date-fns"
import { ArrowDownRight01Icon, ArrowUpRight01Icon, ChartLineData01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { LineChart } from "@/components/charts/line-chart"
import { LineChartLoading } from "@/components/charts/line-chart-loading"
import { Line } from "@/components/charts/line"
import { Grid } from "@/components/charts/grid"
import { XAxis } from "@/components/charts/x-axis"
import { YAxis } from "@/components/charts/y-axis"
import { ChartTooltip } from "@/components/charts/tooltip"
import { chartCssVars } from "@/components/charts/chart-context"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { getRevenueSummary, type RevenueType } from "@/lib/queries/metrics"
import { previousPeriod } from "@/lib/queries/metrics-extended"
import { formatCurrency, formatCurrencyCompact } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000
const MARGIN = { top: 24, right: 16, bottom: 32, left: 56 }
const TITLE = "Revenue vs Previous Period"
const PREV_COLOR = "var(--muted-foreground)"

type RevenueComparisonChartProps = {
  orgId: string
  currency: string
  from: string
  to: string
  revenueType: RevenueType
  displayCurrency?: string
  fxRate?: number
}

// Two get_revenue_summary calls — the selected range and the same-length
// window right before it — overlaid by month index (month 1 vs month 1, …).
// Query keys match revenue-chart.tsx so the current range shares its cache.
export function RevenueComparisonChart({
  orgId,
  currency,
  from,
  to,
  revenueType,
  displayCurrency = currency,
  fxRate = 1,
}: RevenueComparisonChartProps) {
  const prev = useMemo(() => previousPeriod(from, to), [from, to])

  const current = useQuery({
    queryKey: ["metric", orgId, "get_revenue_summary", from, to, revenueType],
    queryFn: () => getRevenueSummary(orgId, from, to, revenueType),
    staleTime: STALE_TIME,
  })
  const previous = useQuery({
    queryKey: ["metric", orgId, "get_revenue_summary", prev.from, prev.to, revenueType],
    queryFn: () => getRevenueSummary(orgId, prev.from, prev.to, revenueType),
    staleTime: STALE_TIME,
  })

  const { chartData, currentTotal, previousTotal } = useMemo(() => {
    const cur = current.data ?? []
    const prv = previous.data ?? []
    const chartData = cur.map((m, i) => {
      const p = prv[i]
      return {
        date: parseISO(m.month),
        current: m.revenue * fxRate,
        previous: (p?.revenue ?? 0) * fxRate,
        previousMonth: p?.month ?? null,
      }
    })
    return {
      chartData,
      currentTotal: cur.reduce((s, m) => s + m.revenue, 0) * fxRate,
      previousTotal: prv.reduce((s, m) => s + m.revenue, 0) * fxRate,
    }
  }, [current.data, previous.data, fxRate])

  const isError = current.isError || previous.isError
  const isLoading = current.isLoading || previous.isLoading

  if (isError) {
    return (
      <ChartCardError
        title={TITLE}
        icon={ChartLineData01Icon}
        onRetry={() => {
          void current.refetch()
          void previous.refetch()
        }}
      />
    )
  }

  const change = previousTotal > 0 ? (currentTotal - previousTotal) / previousTotal : null
  const up = change != null && change >= 0
  const ChangeIcon = up ? ArrowUpRight01Icon : ArrowDownRight01Icon
  const prevLabel = `${format(parseISO(prev.from), "d MMM yyyy")} – ${format(parseISO(prev.to), "d MMM yyyy")}`

  return (
    <ChartCard
      title={TITLE}
      icon={ChartLineData01Icon}
      description={`This range against ${prevLabel}, month by month`}
    >
      {isLoading ? (
        <LineChartLoading aspectRatio="2 / 1" margin={MARGIN} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-semibold tabular-nums">{formatCurrency(currentTotal, displayCurrency)}</span>
            {change != null ? (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-xs font-medium tabular-nums",
                  up ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                )}
              >
                <ChangeIcon size={14} />
                {up ? "+" : ""}
                {Math.round(change * 1000) / 10}%
              </span>
            ) : null}
            <span className="text-xs text-muted-foreground">
              vs {formatCurrency(previousTotal, displayCurrency)} the period before
            </span>
          </div>
          <LineChart data={chartData} xDataKey="date" aspectRatio="2 / 1" margin={MARGIN}>
            <Grid horizontal />
            <Line dataKey="previous" stroke={PREV_COLOR} strokeWidth={2} />
            <Line dataKey="current" stroke={chartCssVars.linePrimary} strokeWidth={2.5} />
            <XAxis />
            <YAxis formatValue={(v) => formatCurrencyCompact(v, displayCurrency)} />
            <ChartTooltip
              rows={(point) => [
                {
                  color: chartCssVars.linePrimary,
                  label: "This period",
                  value: formatCurrency((point.current as number) ?? 0, displayCurrency),
                },
                {
                  color: PREV_COLOR,
                  label: point.previousMonth
                    ? `Previous (${format(parseISO(point.previousMonth as string), "MMM yyyy")})`
                    : "Previous",
                  value: formatCurrency((point.previous as number) ?? 0, displayCurrency),
                },
              ]}
            />
          </LineChart>
        </div>
      )}
    </ChartCard>
  )
}
