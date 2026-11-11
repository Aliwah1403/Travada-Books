import { useMemo } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Alert02Icon, UserStar01Icon } from "@travada-books/ui/icons"
import { PieChart } from "@/components/charts/pie-chart"
import { PieSlice } from "@/components/charts/pie-slice"
import { PieCenter } from "@/components/charts/pie-center"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getCustomerConcentration } from "@/lib/queries/metrics-extended"
import { formatCurrency } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000
const TOP_N = 5
const TITLE = "Customer Concentration"
const RISK_THRESHOLD = 0.4
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
const OTHER_COLOR = "var(--muted-foreground)"

type CustomerConcentrationChartProps = {
  orgId: string
  currency: string
  from: string
  to: string
  displayCurrency?: string
  fxRate?: number
}

type Slice = { label: string; value: number; color: string; customerId: string | null }

const pct = (fraction: number) => `${Math.round(fraction * 100)}%`

// Source: income transactions in range, attributed to a customer directly or
// via their linked invoice (see getCustomerConcentration). Shares are of
// customer-attributed income; unlinked income is reported underneath.
export function CustomerConcentrationChart({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: CustomerConcentrationChartProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "customer_concentration", from, to],
    queryFn: () => getCustomerConcentration(orgId, from, to),
    staleTime: STALE_TIME,
  })

  const { slices, total, headline, topShare } = useMemo(() => {
    const customers = data?.customers ?? []
    const total = (data?.attributedTotal ?? 0) * fxRate
    const slices: Slice[] = customers.slice(0, TOP_N).map((c, i) => ({
      label: c.name,
      value: c.amount * fxRate,
      color: COLORS[i % COLORS.length]!,
      customerId: c.customerId,
    }))
    const rest = customers.slice(TOP_N)
    if (rest.length > 0) {
      slices.push({
        label: `Everyone else (${rest.length})`,
        value: rest.reduce((s, c) => s + c.amount, 0) * fxRate,
        color: OTHER_COLOR,
        customerId: null,
      })
    }
    const topShare = total > 0 && customers[0] ? (customers[0].amount * fxRate) / total : 0
    let headline: string | null = null
    if (customers.length === 1) {
      headline = "1 customer = 100% of revenue"
    } else if (customers.length > 1 && total > 0) {
      const top2 = ((customers[0]!.amount + customers[1]!.amount) * fxRate) / total
      headline = `Top 2 customers = ${pct(top2)} of revenue`
    }
    return { slices, total, headline, topShare }
  }, [data, fxRate])

  if (isError) return <ChartCardError title={TITLE} icon={UserStar01Icon} onRetry={() => refetch()} />

  if (isLoading) {
    return (
      <ChartCard title={TITLE} icon={UserStar01Icon}>
        <div className="flex items-center justify-center py-4">
          <div className="size-40 animate-pulse rounded-full bg-muted" />
        </div>
      </ChartCard>
    )
  }

  if (slices.length === 0) {
    return (
      <ChartCard title={TITLE} icon={UserStar01Icon}>
        <EmptyState
          icon={UserStar01Icon}
          title="No customer income in this period"
          description="Link income to a customer or an invoice to see who drives revenue."
          compact
        />
      </ChartCard>
    )
  }

  const unattributed = (data?.unattributedTotal ?? 0) * fxRate
  const unattributedShare = total + unattributed > 0 ? unattributed / (total + unattributed) : 0

  return (
    <ChartCard title={TITLE} icon={UserStar01Icon} description="Share of customer income in the selected range">
      <div className="flex flex-col gap-3">
        {headline && (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{headline}</span>
            {topShare > RISK_THRESHOLD && (
              <span className="flex items-center gap-1.5 text-xs text-destructive">
                <Alert02Icon size={14} className="shrink-0" />
                {slices[0]!.label} alone is {pct(topShare)} — losing them would hurt.
              </span>
            )}
          </div>
        )}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="w-full max-w-[180px] shrink-0">
            <PieChart data={slices} innerRadius={56} padAngle={0.02} cornerRadius={2}>
              {slices.map((s, index) => (
                <PieSlice key={s.customerId ?? s.label} index={index} hoverEffect="grow" />
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
          <ul className="flex w-full min-w-0 flex-1 flex-col gap-0.5">
            {slices.map((s) => {
              const share = total > 0 ? s.value / total : 0
              const content = (
                <>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="truncate">{s.label}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {formatCurrency(s.value, displayCurrency)} · {pct(share)}
                  </span>
                </>
              )
              return (
                <li key={s.customerId ?? s.label}>
                  {s.customerId ? (
                    <Link
                      to={`/customers/${s.customerId}`}
                      className="-mx-1.5 flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-xs transition-colors active:opacity-80 fine-hover:bg-muted"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-2 py-1 text-xs">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        {unattributedShare >= 0.01 && (
          <p className="text-xs text-muted-foreground">
            {pct(unattributedShare)} of income in this range ({formatCurrency(unattributed, displayCurrency)}) isn't
            linked to a customer and isn't counted here.
          </p>
        )}
      </div>
    </ChartCard>
  )
}
