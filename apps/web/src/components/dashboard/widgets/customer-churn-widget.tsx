import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { UserRemoveIcon } from "@travada-books/ui/icons"
import { WidgetCard, WidgetSkeleton, WidgetError } from "@/components/dashboard/widget-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Gauge } from "@/components/charts/gauge"
import { getCustomerChurn } from "@/lib/queries/metrics"

const STALE_TIME = 2 * 60 * 1000

type CustomerChurnWidgetProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Unused — kept for prop-shape consistency with the other range widgets. */
  displayCurrency?: string
  /** Unused — kept for prop-shape consistency with the other range widgets. */
  fxRate?: number
}

export function CustomerChurnWidget({ orgId, from, to }: CustomerChurnWidgetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_customer_churn", from, to],
    queryFn: () => getCustomerChurn(orgId, from, to),
    staleTime: STALE_TIME,
  })

  if (isLoading) return <WidgetSkeleton />
  if (isError) return <WidgetError title="Customer Churn" icon={UserRemoveIcon} onRetry={() => refetch()} />

  if (!data || data.trailing_active_count === 0) {
    return (
      <WidgetCard title="Customer Churn" icon={UserRemoveIcon}>
        <EmptyState icon={UserRemoveIcon} title="Not enough history yet" compact />
      </WidgetCard>
    )
  }

  const churnPercent = Math.round(data.churn_rate * 1000) / 10
  const extraCount = Math.max(0, data.churned_customers.length - 3)
  // Gauge fill is a "health" score, not the raw rate — lower churn should
  // read as more filled/greener, same inversion as Payment Score's days-to-pay.
  const retentionScore = Math.min(100, Math.max(0, 100 - churnPercent))

  return (
    <WidgetCard title="Customer Churn" icon={UserRemoveIcon}>
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-xl font-semibold tracking-tight">{churnPercent}%</p>
          <p className="text-xs text-muted-foreground">
            {data.churned_count} churned of {data.trailing_active_count} active
          </p>
        </div>
        <div className="mt-1">
          <Gauge
            orientation="linear"
            value={retentionScore}
            totalNotches={72}
            spacing={0}
            notchCornerRadius={3}
            notchLengthPercent={38}
            inactiveFillOpacity={0.4}
            useGradient
          />
        </div>
        {data.churned_customers.length > 0 && (
          <ul className="flex flex-col gap-1 border-t pt-2">
            {data.churned_customers.slice(0, 3).map((c) => (
              <li key={c.customer_id}>
                <Link
                  to={`/customers/${c.customer_id}`}
                  className="block truncate rounded-sm px-1 -mx-1 py-0.5 text-xs text-muted-foreground fine-hover:bg-muted"
                >
                  {c.customer_name ?? "Unnamed customer"}
                </Link>
              </li>
            ))}
            {extraCount > 0 && <li className="px-1 text-xs text-muted-foreground">+{extraCount} more</li>}
          </ul>
        )}
      </div>
    </WidgetCard>
  )
}
