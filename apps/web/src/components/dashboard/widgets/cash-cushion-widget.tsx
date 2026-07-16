import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { SafeIcon } from "@travada-books/ui/icons"
import { WidgetCard, WidgetSkeleton, WidgetError } from "@/components/dashboard/widget-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Gauge } from "@/components/charts/gauge"
import { getRunway } from "@/lib/queries/metrics"
import { formatCurrency } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000
const DISPLAY_CAP_MONTHS = 12

type CashCushionWidgetProps = {
  orgId: string
  currency: string
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function CashCushionWidget({
  orgId,
  currency,
  displayCurrency = currency,
  fxRate = 1,
}: CashCushionWidgetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_runway"],
    queryFn: () => getRunway(orgId),
    staleTime: STALE_TIME,
  })

  if (isLoading) return <WidgetSkeleton />
  if (isError) return <WidgetError title="Cash Cushion" icon={SafeIcon} onRetry={() => refetch()} />

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

  // State b: cash-flow positive — infinite runway.
  if (data.months_remaining === null) {
    return (
      <WidgetCard title="Cash Cushion" icon={SafeIcon}>
        <div className="flex flex-col gap-1">
          <p className="text-xl font-semibold tracking-tight">
            {formatCurrency((data.cash_balance ?? 0) * fxRate, displayCurrency)}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">Cash-flow positive</p>
        </div>
      </WidgetCard>
    )
  }

  // State c: configured and burning.
  const months = data.months_remaining
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
