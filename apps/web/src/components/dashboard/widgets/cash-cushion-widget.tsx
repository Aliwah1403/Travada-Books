import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import NumberFlow from "@number-flow/react"
import { SafeIcon } from "@travada-books/ui/icons"
import {
  WidgetCard,
  WidgetError,
  WidgetHeadlineSkeleton,
  WidgetLineSkeleton,
  WidgetGaugeSkeleton,
} from "@/components/dashboard/widget-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Gauge } from "@/components/charts/gauge"
import { getRunway, getCashFlow } from "@/lib/queries/metrics"

const STALE_TIME = 2 * 60 * 1000
const DISPLAY_CAP_MONTHS = 12

type CashCushionWidgetProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function CashCushionWidget({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: CashCushionWidgetProps) {
  const runwayQuery = useQuery({
    queryKey: ["metric", orgId, "get_runway"],
    queryFn: () => getRunway(orgId),
    staleTime: STALE_TIME,
  })

  // Range-aware burn rate, same query/key as the Burn Rate widget — dedupes
  // when both are on screen. `cash_balance` from get_runway stays a live
  // "as of today" figure; only the burn rate driving months_remaining is
  // recomputed from the selected range. Do not use `get_runway`'s own
  // avg_monthly_burn, it's hard-coded to the last 3 full months.
  const cashFlowQuery = useQuery({
    queryKey: ["metric", orgId, "get_cash_flow", from, to],
    queryFn: () => getCashFlow(orgId, from, to),
    staleTime: STALE_TIME,
  })

  const data = runwayQuery.data
  const isLoading = runwayQuery.isLoading || cashFlowQuery.isLoading
  const isError = runwayQuery.isError || cashFlowQuery.isError
  const refetch = () => {
    runwayQuery.refetch()
    cashFlowQuery.refetch()
  }

  if (isLoading) {
    return (
      <WidgetCard title="Cash Cushion" icon={SafeIcon}>
        <div className="flex flex-col gap-1">
          <WidgetHeadlineSkeleton />
          <WidgetLineSkeleton />
          <WidgetGaugeSkeleton className="mt-2" />
        </div>
      </WidgetCard>
    )
  }
  if (isError) return <WidgetError title="Cash Cushion" icon={SafeIcon} onRetry={refetch} />

  // State a: not configured yet.
  if (!data || !data.is_configured) {
    return (
      <WidgetCard title="Cash Cushion" icon={SafeIcon}>
        <EmptyState
          icon={SafeIcon}
          title="Not set up yet"
          description="Set your starting balance to see how long your cash lasts"
          action={
            <Link to="/settings/general" className="text-xs font-medium text-primary underline-offset-4 fine-hover:underline">
              Go to settings
            </Link>
          }
          compact
        />
      </WidgetCard>
    )
  }

  const cashFlowMonths = cashFlowQuery.data ?? []
  const avgMonthlyNet =
    cashFlowMonths.length > 0 ? cashFlowMonths.reduce((sum, m) => sum + m.net, 0) / cashFlowMonths.length : 0
  // Mirrors the SQL's GREATEST(0, -avg_monthly_net) — a burn rate can't be negative.
  const avgMonthlyBurn = Math.max(0, -avgMonthlyNet)
  const monthsRemaining = avgMonthlyBurn > 0 ? (data.cash_balance ?? 0) / avgMonthlyBurn : null

  // State b: cash-flow positive — infinite runway.
  if (monthsRemaining === null) {
    return (
      <WidgetCard title="Cash Cushion" icon={SafeIcon}>
        <div className="flex flex-col gap-1">
          <NumberFlow
            value={(data.cash_balance ?? 0) * fxRate}
            format={{ style: "currency", currency: displayCurrency }}
            locales="en-US"
            className="text-xl font-semibold tracking-tight"
          />
          <p className="text-xs text-green-600 dark:text-green-400">Cash-flow positive</p>
        </div>
      </WidgetCard>
    )
  }

  // State c: configured and burning.
  const months = monthsRemaining
  const roundedMonths = Math.max(0, Math.round(months))
  const monthsLabel =
    months >= DISPLAY_CAP_MONTHS
      ? `${DISPLAY_CAP_MONTHS}+ months`
      : `${roundedMonths} month${roundedMonths !== 1 ? "s" : ""}`

  const gaugeValue = Math.min(100, Math.max(0, (months / DISPLAY_CAP_MONTHS) * 100))

  return (
    <WidgetCard title="Cash Cushion" icon={SafeIcon}>
      <div className="flex flex-col gap-1">
        <p className="text-xl font-semibold tracking-tight">~{monthsLabel}</p>
        <p className="text-xs text-muted-foreground">At current spending, your cash covers {monthsLabel}</p>
        <div className="mt-2">
          <Gauge
            orientation="linear"
            value={gaugeValue}
            totalNotches={72}
            spacing={0}
            notchCornerRadius={3}
            notchLengthPercent={38}
            inactiveFillOpacity={0.4}
            useGradient
          />
        </div>
      </div>
    </WidgetCard>
  )
}
