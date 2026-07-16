import { useQuery } from "@tanstack/react-query"
import { TaxesIcon } from "@travada-books/ui/icons"
import { WidgetCard, WidgetSkeleton, WidgetError } from "@/components/dashboard/widget-card"
import { getTaxSummary } from "@/lib/queries/metrics"
import { formatCurrency } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000

type TaxSummaryWidgetProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function TaxSummaryWidget({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: TaxSummaryWidgetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_tax_summary", from, to],
    queryFn: () => getTaxSummary(orgId, from, to),
    staleTime: STALE_TIME,
  })

  if (isLoading) return <WidgetSkeleton />
  if (isError) return <WidgetError title="Tax Summary" icon={TaxesIcon} onRetry={() => refetch()} />

  const netTax = (data?.net_tax ?? 0) * fxRate
  const collected = (data?.tax_collected ?? 0) * fxRate
  const paid = (data?.tax_paid ?? 0) * fxRate
  const isOwed = netTax >= 0

  return (
    <WidgetCard title="Tax Summary" icon={TaxesIcon}>
      <div className="flex flex-col gap-1">
        <p className="text-xl font-semibold tracking-tight">
          {isOwed ? "~" : "-"}
          {formatCurrency(Math.abs(netTax), displayCurrency)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(collected, displayCurrency)} collected · {formatCurrency(paid, displayCurrency)} paid
        </p>
        <p className="text-[10px] text-muted-foreground/70">Not a tax filing calculation</p>
      </div>
    </WidgetCard>
  )
}
