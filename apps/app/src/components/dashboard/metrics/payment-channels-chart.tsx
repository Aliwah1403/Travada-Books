import { useMemo } from "react"
import { useNavigate } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { parseISO } from "date-fns"
import { CreditCardIcon } from "@travada-books/ui/icons"
import { BarChart } from "@/components/charts/bar-chart"
import { BarChartLoading } from "@/components/charts/bar-chart-loading"
import { Bar } from "@/components/charts/bar"
import { Grid } from "@/components/charts/grid"
import { XAxis } from "@/components/charts/x-axis"
import { YAxis } from "@/components/charts/y-axis"
import { ChartTooltip } from "@/components/charts/tooltip"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getPaymentChannels, PAYMENT_CHANNELS } from "@/lib/queries/metrics-extended"
import { incomeForMonthUrl } from "@/lib/drilldown"
import { formatCurrency, formatCurrencyCompact } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000
const MARGIN = { top: 24, right: 16, bottom: 32, left: 56 }
const TITLE = "Payment Channels"

type PaymentChannelsChartProps = {
  orgId: string
  currency: string
  from: string
  to: string
  displayCurrency?: string
  fxRate?: number
}

export function PaymentChannelsChart({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: PaymentChannelsChartProps) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "payment_channels", from, to],
    queryFn: () => getPaymentChannels(orgId, from, to),
    staleTime: STALE_TIME,
  })

  const { chartData, totals, grandTotal } = useMemo(() => {
    const totals = Object.fromEntries(PAYMENT_CHANNELS.map((c) => [c.key, 0])) as Record<string, number>
    const chartData = (data ?? []).map((m) => {
      const row: Record<string, unknown> = { date: parseISO(m.month), month: m.month }
      for (const c of PAYMENT_CHANNELS) {
        const value = m[c.key] * fxRate
        row[c.key] = value
        totals[c.key] = (totals[c.key] ?? 0) + value
      }
      return row
    })
    const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)
    return { chartData, totals, grandTotal }
  }, [data, fxRate])

  // Only channels that actually carried money get a series / legend entry.
  const activeChannels = PAYMENT_CHANNELS.filter((c) => (totals[c.key] ?? 0) > 0)

  if (isError) return <ChartCardError title={TITLE} icon={CreditCardIcon} onRetry={() => refetch()} />

  if (!isLoading && grandTotal <= 0) {
    return (
      <ChartCard title={TITLE} icon={CreditCardIcon}>
        <EmptyState icon={CreditCardIcon} title="No money in during this period" compact />
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title={TITLE}
      icon={CreditCardIcon}
      description="How money came in each month · click a month to see its income"
    >
      {isLoading ? (
        <BarChartLoading aspectRatio="2 / 1" margin={MARGIN} />
      ) : (
        <div className="flex flex-col gap-3">
          <BarChart
            data={chartData}
            xDataKey="date"
            aspectRatio="2 / 1"
            margin={MARGIN}
            barGap={0.3}
            stacked
            onBarClick={(point) => navigate(incomeForMonthUrl(point.month as string))}
          >
            <Grid horizontal />
            {activeChannels.map((c) => (
              <Bar key={c.key} dataKey={c.key} fill={c.color} lineCap="butt" />
            ))}
            <XAxis />
            <YAxis formatValue={(v) => formatCurrencyCompact(v, displayCurrency)} />
            <ChartTooltip
              rows={(point) =>
                activeChannels
                  .filter((c) => ((point[c.key] as number) ?? 0) > 0)
                  .map((c) => ({
                    color: c.color,
                    label: c.label,
                    value: formatCurrency((point[c.key] as number) ?? 0, displayCurrency),
                  }))
              }
            />
          </BarChart>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {activeChannels.map((c) => (
              <li key={c.key} className="flex items-center gap-1.5 text-xs">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                <span>{c.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {Math.round(((totals[c.key] ?? 0) / grandTotal) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  )
}
