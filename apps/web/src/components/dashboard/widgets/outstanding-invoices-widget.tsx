import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import NumberFlow from "@number-flow/react"
import { Invoice01Icon } from "@travada-books/ui/icons"
import { Badge } from "@travada-books/ui/components/badge"
import {
  WidgetCard,
  WidgetError,
  WidgetHeadlineSkeleton,
  WidgetLineSkeleton,
} from "@/components/dashboard/widget-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getOutstandingInvoices } from "@/lib/queries/metrics"

const STALE_TIME = 2 * 60 * 1000

// Outstanding invoices are always a live, current-moment snapshot — they
// intentionally ignore the dashboard's date-range filter, so a "Live"
// badge tells the user why the number doesn't move with the filter.
const LIVE_BADGE = (
  <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
    Live
  </Badge>
)

type OutstandingInvoicesWidgetProps = {
  orgId: string
  currency: string
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function OutstandingInvoicesWidget({
  orgId,
  currency,
  displayCurrency = currency,
  fxRate = 1,
}: OutstandingInvoicesWidgetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_outstanding_invoices"],
    queryFn: () => getOutstandingInvoices(orgId),
    staleTime: STALE_TIME,
  })

  if (isLoading) {
    return (
      <WidgetCard title="Outstanding Invoices" icon={Invoice01Icon}>
        <div className="flex flex-col gap-2">
          <div>
            <WidgetHeadlineSkeleton />
            <WidgetLineSkeleton className="mt-1" />
          </div>
          <ul className="flex flex-col gap-1 border-t pt-2">
            <li><WidgetLineSkeleton className="w-full" /></li>
            <li><WidgetLineSkeleton className="w-full" /></li>
            <li><WidgetLineSkeleton className="w-full" /></li>
          </ul>
        </div>
      </WidgetCard>
    )
  }
  if (isError) return <WidgetError title="Outstanding Invoices" icon={Invoice01Icon} onRetry={() => refetch()} />

  const totalOutstanding = ((data?.unpaid_total ?? 0) + (data?.overdue_total ?? 0)) * fxRate

  if (!data || totalOutstanding === 0) {
    return (
      <WidgetCard title="Outstanding Invoices" icon={Invoice01Icon} badge={LIVE_BADGE}>
        <EmptyState icon={Invoice01Icon} title="Nothing outstanding" compact />
      </WidgetCard>
    )
  }

  return (
    <WidgetCard title="Outstanding Invoices" icon={Invoice01Icon} badge={LIVE_BADGE}>
      <div className="flex flex-col gap-2">
        <div>
          <NumberFlow
            value={totalOutstanding}
            format={{ style: "currency", currency: displayCurrency }}
            locales="en-US"
            className="text-xl font-semibold tracking-tight"
          />
          <p className="text-xs text-muted-foreground">
            {data.unpaid_count} unpaid · {data.overdue_count} overdue
          </p>
        </div>
        {data.top_invoices.length > 0 && (
          <ul className="flex flex-col gap-1 border-t pt-2">
            {data.top_invoices.slice(0, 3).map((invoice) => (
              <li key={invoice.id}>
                <Link
                  to={`/invoices/${invoice.id}`}
                  className="flex items-center justify-between gap-2 rounded-sm px-1 -mx-1 py-0.5 text-xs fine-hover:bg-muted"
                >
                  <span className="truncate text-muted-foreground">
                    {invoice.customer_name ?? invoice.invoice_number}
                  </span>
                  <NumberFlow
                    value={invoice.amount * fxRate}
                    format={{ style: "currency", currency: displayCurrency }}
                    locales="en-US"
                    className="shrink-0 font-medium"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WidgetCard>
  )
}
