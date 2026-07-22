import { useQuery } from "@tanstack/react-query"
import { RepeatIcon } from "@travada-books/ui/icons"
import { WidgetCard, WidgetSkeleton, WidgetError } from "@/components/dashboard/widget-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getRecurringExpenses } from "@/lib/queries/metrics"
import { formatCurrency } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000

type RecurringExpensesWidgetProps = {
  orgId: string
  currency: string
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function RecurringExpensesWidget({
  orgId,
  currency,
  displayCurrency = currency,
  fxRate = 1,
}: RecurringExpensesWidgetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_recurring_expenses"],
    queryFn: () => getRecurringExpenses(orgId),
    staleTime: STALE_TIME,
  })

  if (isLoading) return <WidgetSkeleton />
  if (isError) return <WidgetError title="Fixed Costs" icon={RepeatIcon} onRetry={() => refetch()} />

  if (!data || data.count === 0) {
    return (
      <WidgetCard title="Fixed Costs" icon={RepeatIcon}>
        <EmptyState icon={RepeatIcon} title="No recurring expenses set up" compact />
      </WidgetCard>
    )
  }

  return (
    <WidgetCard title="Fixed Costs" icon={RepeatIcon}>
      <div className="flex flex-col gap-1">
        <p className="text-xl font-semibold tracking-tight">{formatCurrency(data.total * fxRate, displayCurrency)}</p>
        <p className="text-xs text-muted-foreground">
          {data.count} recurring expense{data.count !== 1 ? "s" : ""} this month
        </p>
      </div>
    </WidgetCard>
  )
}
