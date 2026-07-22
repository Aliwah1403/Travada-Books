import { useQuery } from "@tanstack/react-query"
import { CheckmarkCircle01Icon, Alert02Icon } from "@travada-books/ui/icons"
import { WidgetCard, WidgetSkeleton, WidgetError } from "@/components/dashboard/widget-card"
import { getOverdueInvoices } from "@/lib/queries/metrics"
import { formatCurrency } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000

type OverdueInvoicesWidgetProps = {
  orgId: string
  currency: string
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function OverdueInvoicesWidget({
  orgId,
  currency,
  displayCurrency = currency,
  fxRate = 1,
}: OverdueInvoicesWidgetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_overdue_invoices"],
    queryFn: () => getOverdueInvoices(orgId),
    staleTime: STALE_TIME,
  })

  if (isLoading) return <WidgetSkeleton />
  if (isError) return <WidgetError title="Overdue Invoices" icon={Alert02Icon} onRetry={() => refetch()} />

  const overdueCount = data?.overdue_count ?? 0

  if (overdueCount === 0) {
    return (
      <WidgetCard title="Overdue Invoices" icon={CheckmarkCircle01Icon} to="/invoices">
        <div className="flex flex-col gap-1">
          <p className="text-xl font-semibold tracking-tight">Nothing overdue</p>
          <p className="text-xs text-muted-foreground">Every invoice is on track.</p>
        </div>
      </WidgetCard>
    )
  }

  return (
    <WidgetCard title="Overdue Invoices" icon={Alert02Icon} to="/invoices">
      <div className="flex flex-col gap-1">
        <p className="text-xl font-semibold tracking-tight">
          {formatCurrency(data!.overdue_total * fxRate, displayCurrency)}
        </p>
        <p className="text-xs text-muted-foreground">
          {overdueCount} invoice{overdueCount !== 1 ? "s" : ""} overdue
        </p>
        {data?.oldest_customer_name && (
          <p className="text-xs text-muted-foreground">
            Oldest: {data.oldest_customer_name} — {data.oldest_days_overdue} day
            {data.oldest_days_overdue !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </WidgetCard>
  )
}
