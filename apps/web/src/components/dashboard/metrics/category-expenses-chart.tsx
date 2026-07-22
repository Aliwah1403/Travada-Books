import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { PieChartIcon } from "@travada-books/ui/icons"
import { PieChart } from "@/components/charts/pie-chart"
import { PieSlice } from "@/components/charts/pie-slice"
import { PieCenter } from "@/components/charts/pie-center"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getExpensesByCategory } from "@/lib/queries/metrics"
import { formatCurrency } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000
const TOP_N = 5
const OTHER_COLOR = "var(--muted-foreground)"

type CategoryExpensesChartProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function CategoryExpensesChart({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: CategoryExpensesChartProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_expenses_by_category", from, to],
    queryFn: () => getExpensesByCategory(orgId, from, to),
    staleTime: STALE_TIME,
  })

  const slices = useMemo(() => {
    const categories = data ?? []
    const top = categories.slice(0, TOP_N)
    const rest = categories.slice(TOP_N)
    const otherTotal = rest.reduce((sum, c) => sum + c.total, 0)

    const result = top.map((c) => ({
      label: c.category_name,
      value: c.total * fxRate,
      color: c.category_color ?? OTHER_COLOR,
    }))

    if (rest.length > 0) {
      result.push({ label: "Other", value: otherTotal * fxRate, color: OTHER_COLOR })
    }

    return result.filter((s) => s.value > 0)
  }, [data, fxRate])

  const total = slices.reduce((sum, s) => sum + s.value, 0)

  if (isError) return <ChartCardError title="Expenses by Category" icon={PieChartIcon} onRetry={() => refetch()} />

  if (isLoading) {
    return (
      <ChartCard title="Expenses by Category" icon={PieChartIcon}>
        <div className="flex items-center justify-center py-4">
          <div className="size-40 animate-pulse rounded-full bg-muted" />
        </div>
      </ChartCard>
    )
  }

  if (slices.length === 0) {
    return (
      <ChartCard title="Expenses by Category" icon={PieChartIcon}>
        <EmptyState icon={PieChartIcon} title="No expenses in this period" compact />
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Expenses by Category" icon={PieChartIcon} description="Top categories for the selected range">
      <div className="flex flex-col items-center gap-4 py-2 sm:flex-row sm:items-center">
        <div className="w-full max-w-[200px] shrink-0">
          <PieChart data={slices} innerRadius={60} padAngle={0.02} cornerRadius={2}>
            {slices.map((_, index) => (
              <PieSlice key={slices[index]!.label} index={index} hoverEffect="grow" />
            ))}
            <PieCenter
              defaultLabel="Total"
              formatOptions={{
                style: "currency",
                currency: displayCurrency,
                notation: "compact",
                maximumFractionDigits: 1,
              }}
            />
          </PieChart>
        </div>
        <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
          {slices.map((s) => {
            const share = total > 0 ? Math.round((s.value / total) * 1000) / 10 : 0
            return (
              <li key={s.label} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.label}</span>
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {formatCurrency(s.value, displayCurrency)} · {share}%
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </ChartCard>
  )
}
