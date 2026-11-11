import { useMemo } from "react"
import { useNavigate } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Clock01Icon } from "@travada-books/ui/icons"
import { Badge } from "@travada-books/ui/components/badge"
import { BarChart } from "@/components/charts/bar-chart"
import { BarChartLoading } from "@/components/charts/bar-chart-loading"
import { Bar } from "@/components/charts/bar"
import { BarXAxis } from "@/components/charts/bar-x-axis"
import { Grid } from "@/components/charts/grid"
import { YAxis } from "@/components/charts/y-axis"
import { ChartTooltip } from "@/components/charts/tooltip"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/shared/empty-state"
import {
  agingBucketDueRange,
  getReceivablesAging,
  type AgingBucketId,
} from "@/lib/queries/metrics-extended"
import { invoicesDrilldownUrl } from "@/lib/drilldown"
import { formatCurrency, formatCurrencyCompact } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000
const MARGIN = { top: 24, right: 16, bottom: 32, left: 56 }
const TITLE = "Receivables Aging"

// Increasing warning colour as invoices age. Each bucket is its own series so
// it can carry its own colour; the chart is `stacked` so a bucket's bar fills
// the whole band (the other series are undefined on that row).
const BUCKET_COLORS: Record<AgingBucketId, string> = {
  current: "var(--chart-2)",
  "1-30": "var(--color-amber-400, #fbbf24)",
  "31-60": "var(--color-orange-500, #f97316)",
  "61-90": "var(--color-red-500, #ef4444)",
  "90+": "var(--color-red-700, #b91c1c)",
}

const LIVE_BADGE = (
  <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
    Live
  </Badge>
)

type ReceivablesAgingChartProps = {
  orgId: string
  currency: string
  /** Unused — aging is a live snapshot. Kept for prop-shape consistency. */
  from?: string
  /** Unused — aging is a live snapshot. Kept for prop-shape consistency. */
  to?: string
  displayCurrency?: string
  fxRate?: number
}

export function ReceivablesAgingChart({
  orgId,
  currency,
  displayCurrency = currency,
  fxRate = 1,
}: ReceivablesAgingChartProps) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "receivables_aging"],
    queryFn: () => getReceivablesAging(orgId),
    staleTime: STALE_TIME,
  })

  const chartData = useMemo(
    () =>
      (data?.buckets ?? []).map((b) => ({
        name: b.label,
        bucketId: b.id,
        count: b.count,
        [b.id]: b.amount * fxRate,
      })),
    [data, fxRate],
  )

  if (isError) return <ChartCardError title={TITLE} icon={Clock01Icon} onRetry={() => refetch()} />

  if (!isLoading && (data?.total ?? 0) <= 0) {
    return (
      <ChartCard title={TITLE} icon={Clock01Icon} badge={LIVE_BADGE}>
        <EmptyState icon={Clock01Icon} title="Nothing outstanding" description="Every sent invoice is paid up." compact />
      </ChartCard>
    )
  }

  const total = (data?.total ?? 0) * fxRate
  const over30Pct = Math.round((data?.over30Share ?? 0) * 100)

  return (
    <ChartCard
      title={TITLE}
      icon={Clock01Icon}
      badge={LIVE_BADGE}
      description="Unpaid balances by how late they are today · click a bar to see those invoices"
    >
      {isLoading || !data ? (
        <BarChartLoading aspectRatio="2 / 1" margin={MARGIN} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-semibold tabular-nums">{formatCurrency(total, displayCurrency)}</span>
            <span className="text-xs text-muted-foreground">
              outstanding ·{" "}
              <span className={over30Pct > 0 ? "font-medium text-destructive" : undefined}>
                {over30Pct}% is over 30 days late
              </span>
            </span>
          </div>
          <BarChart
            data={chartData}
            xDataKey="name"
            aspectRatio="2 / 1"
            margin={MARGIN}
            barGap={0.3}
            stacked
            onBarClick={(point) => {
              const id = point.bucketId as AgingBucketId
              const range = agingBucketDueRange(id, data.asOf)
              navigate(
                invoicesDrilldownUrl({
                  statuses: ["unpaid", "partially_paid", "overdue"],
                  ...range,
                }),
              )
            }}
          >
            <Grid horizontal />
            {data.buckets.map((b) => (
              <Bar key={b.id} dataKey={b.id} fill={BUCKET_COLORS[b.id]} lineCap={4} />
            ))}
            <BarXAxis showAllLabels />
            <YAxis formatValue={(v) => formatCurrencyCompact(v, displayCurrency)} />
            <ChartTooltip
              showDatePill={false}
              rows={(point) => {
                const id = point.bucketId as AgingBucketId
                const count = (point.count as number) ?? 0
                return [
                  {
                    color: BUCKET_COLORS[id],
                    label: `${point.name as string} · ${count} invoice${count === 1 ? "" : "s"}`,
                    value: formatCurrency((point[id] as number) ?? 0, displayCurrency),
                  },
                ]
              }}
            />
          </BarChart>
        </div>
      )}
    </ChartCard>
  )
}
