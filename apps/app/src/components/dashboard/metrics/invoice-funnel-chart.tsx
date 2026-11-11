import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { SendingOrderIcon } from "@travada-books/ui/icons"
import { FunnelChart } from "@/components/charts/funnel-chart"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getInvoiceFunnel } from "@/lib/queries/metrics-extended"

const STALE_TIME = 2 * 60 * 1000
const TITLE = "Invoice to Cash"

type InvoiceFunnelChartProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Unused — invoice counts are not a currency figure. Kept for prop-shape consistency. */
  displayCurrency?: string
  /** Unused — invoice counts are not a currency figure. Kept for prop-shape consistency. */
  fxRate?: number
}

const pct = (num: number, den: number) => (den > 0 ? `${Math.round((num / den) * 100)}%` : "—")
const days = (n: number | null) => (n == null ? "—" : `${Math.round(n)} day${Math.round(n) === 1 ? "" : "s"}`)

// Cohort of invoices issued in the range that went out (see getInvoiceFunnel).
// The funnel's own percentages are vs. Sent; the row underneath shows the
// step-to-step conversion and the median time between steps.
export function InvoiceFunnelChart({ orgId, from, to }: InvoiceFunnelChartProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "invoice_funnel", from, to],
    queryFn: () => getInvoiceFunnel(orgId, from, to),
    staleTime: STALE_TIME,
  })

  const funnelData = useMemo(
    () =>
      data
        ? [
            { label: "Sent", value: data.sent, color: "var(--chart-1)" },
            { label: "Viewed", value: data.viewed, color: "var(--chart-3)" },
            { label: "Any payment", value: data.anyPayment, color: "var(--chart-4)" },
            { label: "Paid in full", value: data.paidInFull, color: "var(--chart-2)" },
          ]
        : [],
    [data],
  )

  if (isError) return <ChartCardError title={TITLE} icon={SendingOrderIcon} onRetry={() => refetch()} />

  if (isLoading || !data) {
    return (
      <ChartCard title={TITLE} icon={SendingOrderIcon}>
        <div className="flex items-end justify-center gap-3 py-6">
          <div className="h-24 w-full max-w-md animate-pulse rounded-md bg-muted" />
        </div>
      </ChartCard>
    )
  }

  if (data.sent === 0) {
    return (
      <ChartCard title={TITLE} icon={SendingOrderIcon}>
        <EmptyState icon={SendingOrderIcon} title="No invoices sent in this period" compact />
      </ChartCard>
    )
  }

  const steps = [
    { label: "Sent → viewed", rate: pct(data.viewed, data.sent), time: days(data.medianDaysToView) },
    { label: "Viewed → any payment", rate: pct(data.anyPayment, data.viewed), time: null },
    { label: "Any → paid in full", rate: pct(data.paidInFull, data.anyPayment), time: null },
    { label: "Sent → paid in full", rate: pct(data.paidInFull, data.sent), time: days(data.medianDaysToPaid) },
  ]

  return (
    <ChartCard
      title={TITLE}
      icon={SendingOrderIcon}
      description="Invoices issued in this period: how many were seen and paid"
    >
      <div className="flex flex-col gap-4">
        <div className="py-2">
          <FunnelChart data={funnelData} layers={3} gap={6} />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
          {steps.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">{s.label}</dt>
              <dd className="font-medium tabular-nums">
                {s.rate}
                {s.time && <span className="font-normal text-muted-foreground"> · median {s.time}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </ChartCard>
  )
}
