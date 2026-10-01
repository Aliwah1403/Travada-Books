import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { UserRemoveIcon } from "@travada-books/ui/icons"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getCustomerChurn } from "@/lib/queries/metrics"

const STALE_TIME = 2 * 60 * 1000

type CustomerActivityChartProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Unused — kept for prop-shape consistency with the other range-bound charts. */
  displayCurrency?: string
  /** Unused — kept for prop-shape consistency with the other range-bound charts. */
  fxRate?: number
}

// get_customer_churn returns ONE snapshot row for the whole selected period
// (trailing window vs. current), not a monthly series — so this is
// deliberately NOT a time-series chart. It's a compact stat panel living
// inside the ChartCard shell for visual consistency with the rest of the
// Metrics tab, not a fake trend line built from a single data point.
export function CustomerActivityChart({ orgId, from, to }: CustomerActivityChartProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_customer_churn", from, to],
    queryFn: () => getCustomerChurn(orgId, from, to),
    staleTime: STALE_TIME,
  })

  if (isError) return <ChartCardError title="Customer Activity" icon={UserRemoveIcon} onRetry={() => refetch()} />

  if (isLoading) {
    return (
      <ChartCard title="Customer Activity" icon={UserRemoveIcon}>
        <div className="flex flex-col gap-3 py-2">
          <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-40 animate-pulse rounded-md bg-muted" />
        </div>
      </ChartCard>
    )
  }

  if (!data || data.trailing_active_count === 0) {
    return (
      <ChartCard title="Customer Activity" icon={UserRemoveIcon}>
        <EmptyState icon={UserRemoveIcon} title="Not enough history yet" compact />
      </ChartCard>
    )
  }

  const churnPercent = Math.round(data.churn_rate * 1000) / 10

  return (
    <ChartCard
      title="Customer Activity"
      icon={UserRemoveIcon}
      description="Churn over the trailing window vs. the selected period"
    >
      <div className="flex flex-col gap-3 py-2">
        <div>
          <p className="text-2xl font-semibold tracking-tight">{churnPercent}%</p>
          <p className="text-xs text-muted-foreground">
            {data.churned_count} churned of {data.trailing_active_count} active customers
          </p>
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
            {data.churned_customers.length > 3 && (
              <li className="px-1 text-xs text-muted-foreground">+{data.churned_customers.length - 3} more</li>
            )}
          </ul>
        )}
      </div>
    </ChartCard>
  )
}
