import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { Invoice01Icon } from "@travada-books/ui/icons"
import { WidgetCard, WidgetSkeleton, WidgetError } from "@/components/dashboard/widget-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getOutstandingInvoices } from "@/lib/queries/metrics"
import { formatCurrency } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000

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

  if (isLoading) return <WidgetSkeleton />
  if (isError) return <WidgetError title="Outstanding Invoices" icon={Invoice01Icon} onRetry={() => refetch()} />

  const totalOutstanding = ((data?.unpaid_total ?? 0) + (data?.overdue_total ?? 0)) * fxRate

  if (!data || totalOutstanding === 0) {
    return (
      <WidgetCard title="Outstanding Invoices" icon={Invoice01Icon}>
        <EmptyState icon={Invoice01Icon} title="Nothing outstanding" compact />
      </WidgetCard>
    )
  }

  return (
    <WidgetCard title="Outstanding Invoices" icon={Invoice01Icon}>
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-xl font-semibold tracking-tight">{formatCurrency(totalOutstanding, displayCurrency)}</p>
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
                  <span className="shrink-0 font-medium">{formatCurrency(invoice.amount * fxRate, displayCurrency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WidgetCard>
  )
}
