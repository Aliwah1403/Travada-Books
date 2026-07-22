import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { addMonths } from "date-fns"
import { SafeIcon } from "@travada-books/ui/icons"
import { AreaChart } from "@/components/charts/area-chart"
import { AreaChartLoading } from "@/components/charts/area-chart-loading"
import { Area } from "@/components/charts/area"
import { Grid } from "@/components/charts/grid"
import { XAxis } from "@/components/charts/x-axis"
import { YAxis } from "@/components/charts/y-axis"
import { ChartTooltip } from "@/components/charts/tooltip"
import { chartCssVars } from "@/components/charts/chart-context"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getRunway } from "@/lib/queries/metrics"
import { formatCurrency, formatCurrencyCompact } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000
const MARGIN = { top: 24, right: 16, bottom: 32, left: 56 }
const MAX_PROJECTION_MONTHS = 36

type CashPositionChartProps = {
  orgId: string
  currency: string
  /** Currency to format/plot in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

/** Straight-line decline from today's cash balance to zero, one point per month. */
function buildProjectionSeries(cashBalance: number, avgMonthlyBurn: number, monthsRemaining: number) {
  const points: { date: Date; balance: number }[] = []
  const now = new Date()
  const totalMonths = Math.min(MAX_PROJECTION_MONTHS, Math.max(1, Math.ceil(monthsRemaining)))

  for (let i = 0; i <= totalMonths; i++) {
    const balance = Math.max(0, cashBalance - avgMonthlyBurn * i)
    points.push({ date: addMonths(now, i), balance })
    if (balance <= 0) break
  }

  return points
}

export function CashPositionChart({
  orgId,
  currency,
  displayCurrency = currency,
  fxRate = 1,
}: CashPositionChartProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_runway"],
    queryFn: () => getRunway(orgId),
    staleTime: STALE_TIME,
  })

  const chartData = useMemo(() => {
    if (!data?.is_configured || data.months_remaining == null) return []
    const avgMonthlyBurn = data.avg_monthly_burn ?? 0
    if (avgMonthlyBurn <= 0) return []
    return buildProjectionSeries(data.cash_balance ?? 0, avgMonthlyBurn, data.months_remaining).map((p) => ({
      ...p,
      balance: p.balance * fxRate,
    }))
  }, [data, fxRate])

  if (isError) return <ChartCardError title="Cash Position" icon={SafeIcon} onRetry={() => refetch()} />

  if (isLoading) {
    return (
      <ChartCard title="Cash Position" icon={SafeIcon}>
        <AreaChartLoading aspectRatio="3 / 1" margin={MARGIN} />
      </ChartCard>
    )
  }

  // State a: no starting balance configured yet — no chart, just the CTA.
  if (!data || !data.is_configured) {
    return (
      <ChartCard title="Cash Position" icon={SafeIcon}>
        <EmptyState
          icon={SafeIcon}
          title="Set your starting balance to project your cash position"
          action={
            <Link to="/settings/general" className="text-xs font-medium text-primary underline-offset-4 fine-hover:underline">
              Go to settings
            </Link>
          }
        />
      </ChartCard>
    )
  }

  // State b: cash-flow positive — infinite runway. Do not draw a line to
  // zero; show the balance and say it's growing, not shrinking.
  if (data.months_remaining === null) {
    return (
      <ChartCard title="Cash Position" icon={SafeIcon} description="Cash-flow positive — no projection needed">
        <div className="flex flex-col gap-1 py-6">
          <p className="text-2xl font-semibold tracking-tight text-green-600 dark:text-green-400">
            {formatCurrency((data.cash_balance ?? 0) * fxRate, displayCurrency)}
          </p>
          <p className="text-xs text-muted-foreground">Your cash balance is growing at current income and spending.</p>
        </div>
      </ChartCard>
    )
  }

  // State c: configured and burning — a straight-line projection.
  return (
    <ChartCard
      title="Cash Position"
      icon={SafeIcon}
      description="Projected at current spending — a straight-line estimate, not a forecast"
    >
      <AreaChart data={chartData} xDataKey="date" aspectRatio="3 / 1" margin={MARGIN}>
        <Grid horizontal />
        <Area
          dataKey="balance"
          fill={chartCssVars.linePrimary}
          stroke={chartCssVars.linePrimary}
          strokeWidth={2.5}
          dashFromIndex={0}
          fillOpacity={0.15}
        />
        <XAxis />
        <YAxis formatValue={(v) => formatCurrencyCompact(v, displayCurrency)} />
        <ChartTooltip
          rows={(point) => [
            {
              color: chartCssVars.linePrimary,
              label: "Projected balance",
              value: formatCurrency((point.balance as number) ?? 0, displayCurrency),
            },
          ]}
        />
      </AreaChart>
    </ChartCard>
  )
}
