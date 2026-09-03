import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { parseISO } from "date-fns"
import NumberFlow from "@number-flow/react"
import { MoneyExchange01Icon } from "@travada-books/ui/icons"
import {
  WidgetCard,
  WidgetError,
  WidgetHeadlineSkeleton,
  WidgetLineSkeleton,
  WidgetChartSkeleton,
} from "@/components/dashboard/widget-card"
import { LineChart, Line } from "@/components/charts/line-chart"
import { chartCssVars } from "@/components/charts/chart-context"
import { getCashFlow } from "@/lib/queries/metrics"

const SPARKLINE_MARGIN = { top: 2, right: 2, bottom: 2, left: 2 }

const STALE_TIME = 2 * 60 * 1000

type CashFlowWidgetProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

export function CashFlowWidget({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: CashFlowWidgetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_cash_flow", from, to],
    queryFn: () => getCashFlow(orgId, from, to),
    staleTime: STALE_TIME,
  })

  // Hooks must run before any early return (see revenue-widget for the full note).
  const sparklineData = useMemo(
    () => (data ?? []).map((m) => ({ date: parseISO(m.month), net: m.net * fxRate })),
    [data, fxRate],
  )

  if (isLoading) {
    return (
      <WidgetCard title="Cash Flow" icon={MoneyExchange01Icon}>
        <div className="flex flex-col gap-2">
          <WidgetHeadlineSkeleton />
          <WidgetLineSkeleton />
          <WidgetChartSkeleton className="mt-1" />
        </div>
      </WidgetCard>
    )
  }
  if (isError) return <WidgetError title="Cash Flow" icon={MoneyExchange01Icon} onRetry={() => refetch()} />

  const months = data ?? []
  const income = months.reduce((sum, m) => sum + m.income, 0) * fxRate
  const expense = months.reduce((sum, m) => sum + m.expense, 0) * fxRate
  const net = income - expense

  return (
    <WidgetCard title="Cash Flow" icon={MoneyExchange01Icon}>
      <div className="flex flex-col gap-2">
        <p
          className={
            net >= 0
              ? "text-xl font-semibold tracking-tight text-green-600 dark:text-green-400"
              : "text-xl font-semibold tracking-tight text-destructive"
          }
        >
          {net >= 0 ? "+" : "-"}
          <NumberFlow
            value={Math.abs(net)}
            format={{ style: "currency", currency: displayCurrency }}
            locales="en-US"
          />
        </p>
        <p className="text-xs text-muted-foreground">
          <NumberFlow value={income} format={{ style: "currency", currency: displayCurrency }} locales="en-US" /> in ·{" "}
          <NumberFlow value={expense} format={{ style: "currency", currency: displayCurrency }} locales="en-US" /> out
        </p>
        {sparklineData.length > 1 && (
          <LineChart data={sparklineData} xDataKey="date" margin={SPARKLINE_MARGIN} className="mt-1 h-10">
            <Line dataKey="net" stroke={chartCssVars.linePrimary} strokeWidth={2} animate={false} />
          </LineChart>
        )}
      </div>
    </WidgetCard>
  )
}
