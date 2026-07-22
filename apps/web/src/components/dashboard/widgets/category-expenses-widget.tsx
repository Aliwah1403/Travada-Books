import { useQuery } from "@tanstack/react-query"
import { PieChartIcon } from "@travada-books/ui/icons"
import { WidgetCard, WidgetSkeleton, WidgetError } from "@/components/dashboard/widget-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getExpensesByCategory } from "@/lib/queries/metrics"
import { formatCurrency } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000

type CategoryExpensesWidgetProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function CategoryExpensesWidget({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: CategoryExpensesWidgetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_expenses_by_category", from, to],
    queryFn: () => getExpensesByCategory(orgId, from, to),
    staleTime: STALE_TIME,
  })

  if (isLoading) return <WidgetSkeleton />
  if (isError) return <WidgetError title="Top Expense Categories" icon={PieChartIcon} onRetry={() => refetch()} />

  const categories = data ?? []

  if (categories.length === 0) {
    return (
      <WidgetCard title="Top Expense Categories" icon={PieChartIcon}>
        <EmptyState icon={PieChartIcon} title="No expenses in this period" compact />
      </WidgetCard>
    )
  }

  const top = categories[0]
  const sharePercent = Math.round(top.share * 1000) / 10

  return (
    <WidgetCard title="Top Expense Categories" icon={PieChartIcon}>
      <div className="flex flex-col gap-2">
        <div>
          <p className="truncate text-xl font-semibold tracking-tight">{top.category_name}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(top.total * fxRate, displayCurrency)} · {sharePercent}% of spend
          </p>
        </div>
        {categories.length > 1 && (
          <ul className="flex flex-col gap-1 border-t pt-2">
            {categories.slice(1, 4).map((category) => (
              <li
                key={category.category_id ?? category.category_name}
                className="flex items-center justify-between gap-2 px-1 py-0.5 text-xs"
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate text-muted-foreground">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: category.category_color ?? "var(--muted-foreground)" }}
                  />
                  <span className="truncate">{category.category_name}</span>
                </span>
                <span className="shrink-0 font-medium">{formatCurrency(category.total * fxRate, displayCurrency)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WidgetCard>
  )
}
