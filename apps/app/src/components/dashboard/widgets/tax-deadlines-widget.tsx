import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { Calendar01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { WidgetCard, WidgetLineSkeleton } from "@/components/dashboard/widget-card"
import { EmptyState } from "@/components/shared/empty-state"
import { useAuth } from "@/contexts/auth-context"
import { getTaxSummary } from "@/lib/queries/metrics"
import { getTaxDeadlines, type TaxDeadline } from "@/lib/tax-calendar"
import { formatCurrencyCompact } from "@/lib/format"

const TITLE = "Tax Deadlines"
const STALE_TIME = 2 * 60 * 1000
const MAX_FOLLOWING = 3

type TaxDeadlinesWidgetProps = {
  orgId: string
  currency: string
  /** Currency to format in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

function daysLabel(days: number): string {
  if (days === 0) return "due today"
  if (days === 1) return "due tomorrow"
  return `due in ${days} days`
}

function urgencyClass(days: number): string {
  if (days <= 3) return "text-destructive"
  if (days <= 7) return "text-amber-600 dark:text-amber-400"
  return "text-muted-foreground"
}

function formatDue(iso: string): string {
  return format(parseISO(iso), "EEE d MMM")
}

/**
 * Upcoming statutory deadlines for the org's country. Only registered for
 * countries `lib/tax-calendar.ts` supports — the widget provider hides it
 * everywhere else. Deliberately ignores the dashboard's date-range filter:
 * deadlines are always "from today".
 */
export function TaxDeadlinesWidget({
  orgId,
  currency,
  displayCurrency = currency,
  fxRate = 1,
}: TaxDeadlinesWidgetProps) {
  const { org } = useAuth()
  // Fixed for the lifetime of the mount — the dashboard isn't left open across days often enough to matter.
  const [today] = useState(() => new Date())

  const deadlines = useMemo(() => getTaxDeadlines(org?.country_code, today), [org?.country_code, today])

  const [next, ...rest] = deadlines
  const following = rest.slice(0, MAX_FOLLOWING)

  // The VAT estimate is for the period the next VAT return covers (the
  // previous calendar month relative to its due date).
  const vat = deadlines.find((d) => d.kind === "vat" && d.periodFrom && d.periodTo)
  const vatFrom = vat?.periodFrom ?? ""
  const vatTo = vat?.periodTo ?? ""

  const { data: vatSummary, isLoading: vatLoading } = useQuery({
    queryKey: ["metric", orgId, "get_tax_summary", vatFrom, vatTo],
    queryFn: () => getTaxSummary(orgId, vatFrom, vatTo),
    enabled: Boolean(vat),
    staleTime: STALE_TIME,
  })

  function vatEstimate(deadline: TaxDeadline) {
    if (deadline.id !== vat?.id) return null
    if (vatLoading) return <WidgetLineSkeleton className="h-3 w-20" />
    const netTax = (vatSummary?.net_tax ?? 0) * fxRate
    if (netTax <= 0) return <span className="text-muted-foreground">Nothing owed est.</span>
    return <span>~{formatCurrencyCompact(netTax, displayCurrency)} est.</span>
  }

  if (!next) {
    return (
      <WidgetCard title={TITLE} icon={Calendar01Icon}>
        <EmptyState icon={Calendar01Icon} title="No deadlines in the next 45 days" compact />
      </WidgetCard>
    )
  }

  const nextDays = differenceInCalendarDays(parseISO(next.dueDate), today)

  return (
    <WidgetCard title={TITLE} icon={Calendar01Icon}>
      <div className="flex flex-col gap-1">
        <p className="truncate text-xl font-semibold tracking-tight" title={next.name}>
          {next.shortName} · <span className={urgencyClass(nextDays)}>{daysLabel(nextDays)}</span>
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">
            {formatDue(next.dueDate)} · {next.periodLabel}
          </span>
          {next.kind === "vat" && (
            <span className="ml-auto shrink-0 text-foreground">{vatEstimate(next)}</span>
          )}
        </div>

        {following.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 border-t pt-2">
            {following.map((d) => {
              const days = differenceInCalendarDays(parseISO(d.dueDate), today)
              return (
                <li key={d.id} className="flex items-center gap-2 text-xs" title={d.description}>
                  <span className="truncate">{d.shortName}</span>
                  {d.kind === "vat" && (
                    <span className="shrink-0 text-muted-foreground">{vatEstimate(d)}</span>
                  )}
                  <span className={cn("ml-auto shrink-0 tabular-nums", urgencyClass(days))}>
                    {formatDue(d.dueDate)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </WidgetCard>
  )
}
