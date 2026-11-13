import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { format, parseISO, subDays } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@travada-books/ui/components/card"
import { Button } from "@travada-books/ui/components/button"
import { Alert01Icon, ArrowRight01Icon, CheckmarkCircle02Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { invoicesDrilldownUrl, quotesDrilldownUrl, transactionsDrilldownUrl } from "@/lib/drilldown"
import { formatCurrencyCompact } from "@/lib/format"
import { localToday } from "@/lib/queries/forecast"
import {
  BILLS_DUE_WINDOW_DAYS,
  UNCATEGORIZED_WINDOW_DAYS,
  getNeedsAttention,
  needsAttentionQueryKey,
  type NeedsAttention as NeedsAttentionData,
} from "@/lib/queries/needs-attention"

const STALE_TIME = 60 * 1000

type NeedsAttentionProps = {
  orgId: string
  displayCurrency: string
  fxRate: number
}

type Row = {
  id: string
  label: string
  detail?: string
  count: number
  href: string
  urgent?: boolean
}

function buildRows(d: NeedsAttentionData, today: string, money: (base: number) => string): Row[] {
  const yesterday = format(subDays(parseISO(today), 1), "yyyy-MM-dd")
  const rows: Row[] = [
    {
      id: "overdue-invoices",
      label: "Overdue invoices",
      detail: d.overdueInvoices.count > 0 ? money(d.overdueInvoices.amount) : undefined,
      count: d.overdueInvoices.count,
      // Open invoices with a due date before today — matches the count, which
      // includes invoices whose status hasn't flipped to "overdue" yet.
      href: invoicesDrilldownUrl({ statuses: ["unpaid", "partially_paid", "overdue"], dueTo: yesterday }),
      urgent: true,
    },
    {
      id: "bills-due",
      label: "Bills due",
      detail:
        d.billsDue.pastDue > 0
          ? `${d.billsDue.pastDue} past due`
          : `Within ${BILLS_DUE_WINDOW_DAYS} days`,
      count: d.billsDue.count,
      href: "/bills",
      urgent: d.billsDue.pastDue > 0,
    },
    {
      id: "draft-invoices",
      label: "Drafts not sent",
      count: d.draftInvoices,
      href: invoicesDrilldownUrl({ statuses: ["draft"] }),
    },
    {
      id: "quotes-awaiting",
      label: "Quotes awaiting a reply",
      count: d.quotesAwaiting,
      href: quotesDrilldownUrl({ statuses: ["sent"], validFrom: today }),
    },
    {
      id: "uncategorized",
      label: "Uncategorized expenses",
      detail: `Last ${UNCATEGORIZED_WINDOW_DAYS} days`,
      count: d.uncategorizedExpenses,
      // The transactions list has no "no category" filter — land on the
      // window's expenses instead.
      href: transactionsDrilldownUrl({
        from: format(subDays(parseISO(today), UNCATEGORIZED_WINDOW_DAYS - 1), "yyyy-MM-dd"),
        to: today,
        type: "expense",
      }),
    },
  ]
  return rows.filter((r) => r.count > 0)
}

/** Compact counted list of things waiting on the user. */
export function NeedsAttention({ orgId, displayCurrency, fxRate }: NeedsAttentionProps) {
  const today = localToday()
  const query = useQuery({
    queryKey: needsAttentionQueryKey(orgId, today),
    queryFn: () => getNeedsAttention(orgId, today),
    staleTime: STALE_TIME,
  })
  const money = (base: number) => formatCurrencyCompact(base * fxRate, displayCurrency)
  const rows = query.data ? buildRows(query.data, today, money) : null

  return (
    <Card className="h-full w-full">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Alert01Icon size={16} className="shrink-0 text-muted-foreground" />
        <CardTitle>Needs attention</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        {query.isError ? (
          <div className="flex items-center gap-3">
            <p className="flex-1 text-xs text-muted-foreground">Couldn't check what's waiting.</p>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        ) : rows == null ? (
          <ul className="flex flex-col gap-1">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-3 py-2">
                <div className={cn("h-3.5 animate-pulse rounded-md bg-muted", i % 2 ? "w-28" : "w-36")} />
                <div className="ml-auto h-4 w-6 animate-pulse rounded-full bg-muted" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <CheckmarkCircle02Icon size={14} className="shrink-0 text-green-600 dark:text-green-400" />
            You're all caught up.
          </p>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  to={row.href}
                  className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors fine-hover:bg-muted/60 active:opacity-80"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-xs font-medium">{row.label}</span>
                    {row.detail && (
                      <span className="truncate text-[0.6875rem] text-muted-foreground">{row.detail}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-medium tabular-nums",
                      row.urgent ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"
                    )}
                  >
                    {row.count}
                  </span>
                  <ArrowRight01Icon size={12} className="shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
