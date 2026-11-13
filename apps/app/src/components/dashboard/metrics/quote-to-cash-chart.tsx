import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { SendingOrderIcon } from "@travada-books/ui/icons"
import { FunnelChart } from "@/components/charts/funnel-chart"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getQuoteConversionFunnel } from "@/lib/queries/metrics"
import { getInvoiceFunnel } from "@/lib/queries/metrics-extended"

const STALE_TIME = 2 * 60 * 1000
const TITLE = "Quote to Cash"

type QuoteToCashChartProps = {
  orgId: string
  from: string
  to: string
}

const pct = (num: number, den: number) => (den > 0 ? `${Math.round((num / den) * 100)}%` : "—")
const days = (n: number | null) => (n == null ? null : `${Math.round(n)} day${Math.round(n) === 1 ? "" : "s"}`)

// One card for the whole sales pipeline. Quotes and invoices are separate
// cohorts (most invoices don't start as a quote), so they can't be chained
// into one funnel without inventing drop-off: the quote stages sit in a strip
// on top, and the funnel itself is invoices issued in the range.
export function QuoteToCashChart({ orgId, from, to }: QuoteToCashChartProps) {
  const quotes = useQuery({
    queryKey: ["metric", orgId, "get_quote_conversion_funnel", from, to],
    queryFn: () => getQuoteConversionFunnel(orgId, from, to),
    staleTime: STALE_TIME,
  })
  const invoices = useQuery({
    queryKey: ["metric", orgId, "invoice_funnel", from, to],
    queryFn: () => getInvoiceFunnel(orgId, from, to),
    staleTime: STALE_TIME,
  })

  const quoteTotals = useMemo(() => {
    const months = quotes.data ?? []
    return {
      sent: months.reduce((sum, m) => sum + m.sent, 0),
      accepted: months.reduce((sum, m) => sum + m.accepted, 0),
      invoiced: months.reduce((sum, m) => sum + m.invoiced, 0),
    }
  }, [quotes.data])

  const funnelData = useMemo(() => {
    const d = invoices.data
    return d
      ? [
          { label: "Sent", value: d.sent, color: "var(--chart-1)" },
          { label: "Viewed", value: d.viewed, color: "var(--chart-3)" },
          { label: "Any payment", value: d.anyPayment, color: "var(--chart-4)" },
          { label: "Paid in full", value: d.paidInFull, color: "var(--chart-2)" },
        ]
      : []
  }, [invoices.data])

  if (quotes.isError || invoices.isError) {
    return (
      <ChartCardError
        title={TITLE}
        icon={SendingOrderIcon}
        onRetry={() => {
          void quotes.refetch()
          void invoices.refetch()
        }}
      />
    )
  }

  if (quotes.isLoading || invoices.isLoading || !invoices.data) {
    return (
      <ChartCard title={TITLE} icon={SendingOrderIcon}>
        <div className="flex flex-col gap-4 py-2">
          <div className="h-12 w-full animate-pulse rounded-md bg-muted" />
          <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
        </div>
      </ChartCard>
    )
  }

  const inv = invoices.data
  if (inv.sent === 0 && quoteTotals.sent === 0) {
    return (
      <ChartCard title={TITLE} icon={SendingOrderIcon}>
        <EmptyState icon={SendingOrderIcon} title="No quotes or invoices sent in this period" compact />
      </ChartCard>
    )
  }

  const quoteSteps = [
    { label: "Quotes sent", value: String(quoteTotals.sent) },
    { label: "Accepted", value: `${quoteTotals.accepted} · ${pct(quoteTotals.accepted, quoteTotals.sent)}` },
    { label: "Became invoices", value: `${quoteTotals.invoiced} · ${pct(quoteTotals.invoiced, quoteTotals.accepted)}` },
  ]
  const toView = days(inv.medianDaysToView)
  const toPaid = days(inv.medianDaysToPaid)

  return (
    <ChartCard
      title={TITLE}
      icon={SendingOrderIcon}
      description="From quote to money in the bank, for documents sent in this period"
    >
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-3 gap-3 rounded-md bg-muted/50 px-3 py-2.5 text-xs">
          {quoteSteps.map((s) => (
            <div key={s.label} className="flex min-w-0 flex-col gap-0.5">
              <dt className="truncate text-muted-foreground">{s.label}</dt>
              <dd className="font-medium tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>

        {inv.sent > 0 ? (
          <>
            <div className="py-1">
              <FunnelChart data={funnelData} layers={3} gap={6} />
            </div>
            <p className="text-xs text-muted-foreground">
              {pct(inv.paidInFull, inv.sent)} of invoices sent were paid in full
              {toPaid && ` · median ${toPaid} from sending to paid`}
              {toView && ` · opened after a median ${toView}`}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No invoices sent in this period.</p>
        )}
      </div>
    </ChartCard>
  )
}
