import { useQuery } from "@tanstack/react-query"
import NumberFlow from "@number-flow/react"
import { QuoteIcon } from "@travada-books/ui/icons"
import {
  WidgetCard,
  WidgetError,
  WidgetHeadlineSkeleton,
  WidgetLineSkeleton,
  WidgetGaugeSkeleton,
} from "@/components/dashboard/widget-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Gauge } from "@/components/charts/gauge"
import { getQuotePipeline } from "@/lib/queries/metrics"

const STALE_TIME = 2 * 60 * 1000

type QuotesPipelineWidgetProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function QuotesPipelineWidget({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: QuotesPipelineWidgetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_quote_pipeline", from, to],
    queryFn: () => getQuotePipeline(orgId, from, to),
    staleTime: STALE_TIME,
  })

  if (isLoading) {
    return (
      <WidgetCard title="Quotes Pipeline" icon={QuoteIcon}>
        <div className="flex flex-col gap-1">
          <WidgetHeadlineSkeleton />
          <WidgetLineSkeleton />
          <WidgetLineSkeleton className="w-40" />
          <WidgetGaugeSkeleton className="mt-2" />
        </div>
      </WidgetCard>
    )
  }
  if (isError) return <WidgetError title="Quotes Pipeline" icon={QuoteIcon} onRetry={() => refetch()} />

  if (!data || data.open_count === 0) {
    return (
      <WidgetCard title="Quotes Pipeline" icon={QuoteIcon}>
        <EmptyState icon={QuoteIcon} title="No open quotes" compact />
      </WidgetCard>
    )
  }

  const acceptancePercent = Math.round(data.acceptance_rate * 1000) / 10
  const avgDays = data.avg_days_to_decide !== null ? Math.round(data.avg_days_to_decide * 10) / 10 : null

  return (
    <WidgetCard title="Quotes Pipeline" icon={QuoteIcon} to="/quotes">
      <div className="flex flex-col gap-1">
        <NumberFlow
          value={data.open_value * fxRate}
          format={{ style: "currency", currency: displayCurrency }}
          locales="en-US"
          className="text-xl font-semibold tracking-tight"
        />
        <p className="text-xs text-muted-foreground">{data.open_count} open quotes</p>
        <p className="text-xs text-muted-foreground">
          {acceptancePercent}% acceptance rate{avgDays !== null ? ` · ${avgDays} days to decide` : ""}
        </p>
        <div className="mt-2">
          <Gauge
            orientation="linear"
            value={acceptancePercent}
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
