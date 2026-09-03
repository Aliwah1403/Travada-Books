import { useQuery } from "@tanstack/react-query"
import { TargetIcon, ArrowUpRight01Icon, ArrowDownRight01Icon } from "@travada-books/ui/icons"
import {
  WidgetCard,
  WidgetError,
  WidgetHeadlineSkeleton,
  WidgetLineSkeleton,
  WidgetGaugeSkeleton,
} from "@/components/dashboard/widget-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Gauge } from "@/components/charts/gauge"
import { getInvoicePaymentStats } from "@/lib/queries/metrics"

const STALE_TIME = 2 * 60 * 1000
// Judgment call: 60 days to pay maps to a score of 0. Most invoice terms in
// this app top out at net-30/net-45, so 60 gives headroom before bottoming out.
const MAX_DAYS = 60

type PaymentScoreWidgetProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Unused — kept for prop-shape consistency with the other range widgets. */
  displayCurrency?: string
  /** Unused — kept for prop-shape consistency with the other range widgets. */
  fxRate?: number
}

export function PaymentScoreWidget({ orgId, from, to }: PaymentScoreWidgetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_invoice_payment_stats", from, to],
    queryFn: () => getInvoicePaymentStats(orgId, from, to),
    staleTime: STALE_TIME,
  })

  if (isLoading) {
    return (
      <WidgetCard title="Payment Score" icon={TargetIcon}>
        <div className="flex flex-col gap-1">
          <WidgetHeadlineSkeleton />
          <WidgetLineSkeleton />
          <WidgetGaugeSkeleton className="mt-2" />
        </div>
      </WidgetCard>
    )
  }
  if (isError) return <WidgetError title="Payment Score" icon={TargetIcon} onRetry={() => refetch()} />

  if (!data || data.invoice_count === 0 || data.avg_days_to_pay === null) {
    return (
      <WidgetCard title="Payment Score" icon={TargetIcon}>
        <EmptyState icon={TargetIcon} title="No invoices paid in this period" compact />
      </WidgetCard>
    )
  }

  const avgDays = Math.round(data.avg_days_to_pay)
  const prevAvgDays = data.prev_avg_days_to_pay !== null ? Math.round(data.prev_avg_days_to_pay) : null
  const delta = prevAvgDays !== null ? avgDays - prevAvgDays : null
  // Fewer days to pay is an improvement — polarity is inverted vs a
  // revenue-style widget: going down is good, going up is bad.
  const isImproving = delta !== null && delta < 0
  const isWorsening = delta !== null && delta > 0
  const TrendIcon = isImproving ? ArrowDownRight01Icon : ArrowUpRight01Icon
  const score = Math.min(100, Math.max(0, 100 - (avgDays / MAX_DAYS) * 100))

  return (
    <WidgetCard title="Payment Score" icon={TargetIcon}>
      <div className="flex flex-col gap-1">
        <p className="text-xl font-semibold tracking-tight">{avgDays} days to pay</p>
        {delta !== null && delta !== 0 && (
          <div
            className={
              isImproving
                ? "flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
                : isWorsening
                  ? "flex items-center gap-1 text-xs text-destructive"
                  : "flex items-center gap-1 text-xs text-muted-foreground"
            }
          >
            <TrendIcon size={12} className="shrink-0" />
            <span>{Math.abs(delta)} days vs previous period</span>
          </div>
        )}
        {delta === null && <p className="text-xs text-muted-foreground">{data.invoice_count} invoices paid</p>}
        <div className="mt-2">
          <Gauge
            orientation="linear"
            value={score}
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
