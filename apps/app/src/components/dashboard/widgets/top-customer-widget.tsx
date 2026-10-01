import { useQuery } from "@tanstack/react-query"
import NumberFlow from "@number-flow/react"
import { UserStar01Icon } from "@travada-books/ui/icons"
import {
  WidgetCard,
  WidgetError,
  WidgetHeadlineSkeleton,
  WidgetLineSkeleton,
} from "@/components/dashboard/widget-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getTopCustomer } from "@/lib/queries/metrics"

const STALE_TIME = 2 * 60 * 1000

type TopCustomerWidgetProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function TopCustomerWidget({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: TopCustomerWidgetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_top_customer", from, to],
    queryFn: () => getTopCustomer(orgId, from, to),
    staleTime: STALE_TIME,
  })

  if (isLoading) {
    return (
      <WidgetCard title="Top Customer" icon={UserStar01Icon}>
        <div className="flex flex-col gap-1">
          <WidgetHeadlineSkeleton />
          <WidgetLineSkeleton />
        </div>
      </WidgetCard>
    )
  }
  if (isError) return <WidgetError title="Top Customer" icon={UserStar01Icon} onRetry={() => refetch()} />

  if (!data) {
    return (
      <WidgetCard title="Top Customer" icon={UserStar01Icon}>
        <EmptyState icon={UserStar01Icon} title="No income in this period" compact />
      </WidgetCard>
    )
  }

  const sharePercent = Math.round(data.share * 1000) / 10

  return (
    <WidgetCard title="Top Customer" icon={UserStar01Icon} to={`/customers/${data.customer_id}`}>
      <div className="flex flex-col gap-1">
        <p className="truncate text-xl font-semibold tracking-tight">{data.customer_name ?? "Unnamed customer"}</p>
        <p className="text-xs text-muted-foreground">
          <NumberFlow
            value={data.revenue * fxRate}
            format={{ style: "currency", currency: displayCurrency }}
            locales="en-US"
          />{" "}
          · {sharePercent}% of revenue
        </p>
      </div>
    </WidgetCard>
  )
}
