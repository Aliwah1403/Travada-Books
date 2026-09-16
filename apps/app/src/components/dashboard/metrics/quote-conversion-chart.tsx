import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { QuoteIcon } from "@travada-books/ui/icons"
import { FunnelChart } from "@/components/charts/funnel-chart"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getQuoteConversionFunnel } from "@/lib/queries/metrics"

const STALE_TIME = 2 * 60 * 1000

type QuoteConversionChartProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Unused — quote counts are not a currency figure. Kept for prop-shape consistency. */
  displayCurrency?: string
  /** Unused — quote counts are not a currency figure. Kept for prop-shape consistency. */
  fxRate?: number
}

// get_quote_conversion_funnel returns a zero-filled MONTHLY series (each
// month's sent/accepted/invoiced cohort). A funnel visualization is a single
// pipeline, not a time series, so the months are summed into one Sent →
// Accepted → Invoiced funnel for the whole selected range.
export function QuoteConversionChart({ orgId, from, to }: QuoteConversionChartProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_quote_conversion_funnel", from, to],
    queryFn: () => getQuoteConversionFunnel(orgId, from, to),
    staleTime: STALE_TIME,
  })

  const totals = useMemo(() => {
    const months = data ?? []
    return {
      sent: months.reduce((sum, m) => sum + m.sent, 0),
      accepted: months.reduce((sum, m) => sum + m.accepted, 0),
      invoiced: months.reduce((sum, m) => sum + m.invoiced, 0),
    }
  }, [data])

  const funnelData = useMemo(
    () => [
      { label: "Sent", value: totals.sent, color: "var(--chart-1)" },
      { label: "Accepted", value: totals.accepted, color: "var(--chart-2)" },
      { label: "Invoiced", value: totals.invoiced, color: "var(--chart-3)" },
    ],
    [totals]
  )

  if (isError) return <ChartCardError title="Quote Conversion" icon={QuoteIcon} onRetry={() => refetch()} />

  if (isLoading) {
    return (
      <ChartCard title="Quote Conversion" icon={QuoteIcon}>
        <div className="flex items-end justify-center gap-3 py-6">
          <div className="h-24 w-full max-w-md animate-pulse rounded-md bg-muted" />
        </div>
      </ChartCard>
    )
  }

  if (totals.sent === 0) {
    return (
      <ChartCard title="Quote Conversion" icon={QuoteIcon}>
        <EmptyState icon={QuoteIcon} title="No quotes sent in this period" compact />
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title="Quote Conversion"
      icon={QuoteIcon}
      description="Of quotes sent in this period, how many were accepted and became an invoice"
    >
      <div className="py-4">
        <FunnelChart data={funnelData} layers={3} gap={6} />
      </div>
    </ChartCard>
  )
}
