import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@travada-books/ui/components/sheet"
import { Button } from "@travada-books/ui/components/button"
import {
  Alert01Icon,
  ArrowDownRight01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Invoice01Icon,
  ReceiptTextIcon,
  SparklesIcon,
} from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { formatCurrency } from "@/lib/format"
import { LogEvents, trackEvent } from "@/lib/analytics"
import { openAssistant } from "@/lib/assistant-launcher"
import { listInsights, type Insight, type InsightDelta } from "@/lib/queries/insights"

// The weekly AI summaries, read in a sheet over the Overview. Open state lives
// in the URL (`?insight=<id>` or `?insight=latest`) so the weekly email —
// which links to /insights, redirected here — and the browser back button
// both land on the right week.
//
// Layout is deliberately quiet: the lede, one hairline row of figures, the
// actions as a checklist, and past weeks as a timeline — no card grid.

export const INSIGHT_PARAM = "insight"
export const LATEST_INSIGHT = "latest"
const FROM_EMAIL = "weekly-insight"
/** Summaries longer than this start clamped, with "Read more". */
const LEDE_CHARS = 180

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// Weeks are Monday to Sunday in UTC, so the label is built from the date string
// itself; going through Date would shift it for viewers west of UTC.
const day = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`
const periodLabel = (start: string, end: string) => `${day(start)} – ${day(end)}`

/** Icon per worker action id (apps/worker/src/lib/insights/narrative.ts). */
const ACTION_ICONS: Record<string, typeof Invoice01Icon> = {
  overdue_invoices: Invoice01Icon,
  bills_due: Clock01Icon,
  missing_receipts: ReceiptTextIcon,
  categorise_transactions: CheckmarkCircle02Icon,
  review_spend: ArrowUpRight01Icon,
  review_runway: Alert01Icon,
}

export function WeeklySummarySheet({ orgId }: { orgId: string }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get(INSIGHT_PARAM)
  const open = requested != null

  const { data: insights = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["insights", orgId],
    queryFn: () => listInsights(orgId),
    enabled: open,
  })

  const latest = insights[0] ?? null
  const current =
    requested === LATEST_INSIGHT ? latest : (insights.find((i) => i.id === requested) ?? latest)

  // Arrived from the weekly email: count it once, then drop only that param.
  const emailTracked = useRef(false)
  useEffect(() => {
    if (searchParams.get("from") !== FROM_EMAIL) return
    if (!emailTracked.current) {
      emailTracked.current = true
      trackEvent(LogEvents.InsightEmailOpened, {})
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete("from")
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  const viewedId = useRef<string | null>(null)
  useEffect(() => {
    if (!open || !current || viewedId.current === current.id) return
    viewedId.current = current.id
    trackEvent(LogEvents.InsightViewed, {
      period_start: current.period_start,
      is_latest: current.id === latest?.id,
    })
  }, [open, current, latest])

  const setWeek = (id: string | null) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id) next.set(INSIGHT_PARAM, id)
        else next.delete(INSIGHT_PARAM)
        return next
      },
      // Switching weeks inside the sheet shouldn't pile up history entries.
      { replace: id != null },
    )

  const weekPrompt = current
    ? `Tell me more about my weekly summary for ${periodLabel(current.period_start, current.period_end)}: "${current.content.title}". ${current.content.summary}`
    : ""

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setWeek(null)
      }}
    >
      <SheetContent side="right" className="flex flex-col sm:max-w-lg">
        <SheetHeader className="gap-1 px-6 pt-6 pb-4">
          <SheetDescription className="flex items-center gap-1.5">
            <SparklesIcon size={12} className="shrink-0" />
            {current ? `Week of ${periodLabel(current.period_start, current.period_end)}` : "Weekly summary"}
          </SheetDescription>
          <SheetTitle className="text-base leading-snug font-semibold text-pretty">
            {current?.content.title ?? "Weekly summary"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <SummarySkeleton />
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : !current ? (
            <EmptyState
              icon={SparklesIcon}
              title="No summaries yet"
              description="Your first summary arrives the Monday after your first week of activity."
              compact
            />
          ) : (
            <>
              <Lede key={current.id} text={current.content.summary} />
              <Figures insight={current} />
              {current.content.actions.length > 0 && (
                <section className="flex flex-col gap-1">
                  <SectionLabel>Worth doing this week</SectionLabel>
                  <ul className="-mx-2 flex flex-col">
                    {current.content.actions.map((a) => {
                      const Icon = ACTION_ICONS[a.id] ?? CheckmarkCircle02Icon
                      return (
                        <li key={a.id}>
                          <Link
                            to={a.href}
                            onClick={() => trackEvent(LogEvents.InsightActionClicked, { action_id: a.id })}
                            className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors active:opacity-80 fine-hover:bg-muted"
                          >
                            <Icon size={16} className="shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1">{a.text}</span>
                            <ArrowRight01Icon
                              size={14}
                              className="shrink-0 text-muted-foreground/60"
                            />
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
              {insights.length > 1 && (
                <section className="flex flex-col gap-2">
                  <SectionLabel>Past weeks</SectionLabel>
                  <ol className="flex flex-col">
                    {insights.map((i, idx) => {
                      const selected = i.id === current.id
                      return (
                        <li key={i.id} className="relative pl-5">
                          {/* rail */}
                          {idx < insights.length - 1 && (
                            <span aria-hidden className="absolute top-3 bottom-0 left-[3.5px] w-px bg-border" />
                          )}
                          <span
                            aria-hidden
                            className={cn(
                              "absolute top-[7px] left-0 size-2 rounded-full border",
                              selected ? "border-foreground bg-foreground" : "border-muted-foreground/50 bg-background",
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => setWeek(i.id)}
                            aria-current={selected}
                            className="flex w-full flex-col items-start gap-0.5 pb-4 text-left transition-colors active:opacity-80"
                          >
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {periodLabel(i.period_start, i.period_end)}
                            </span>
                            <span
                              className={cn(
                                "text-sm text-pretty transition-colors",
                                selected ? "font-medium text-foreground" : "text-muted-foreground fine-hover:text-foreground",
                              )}
                            >
                              {i.content.title}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                </section>
              )}
            </>
          )}
        </div>

        {current && (
          <SheetFooter className="border-t px-6 py-4">
            <Button onClick={() => openAssistant(weekPrompt)}>
              <SparklesIcon data-icon="inline-start" />
              Ask Travada about this week
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-medium text-muted-foreground">{children}</h3>
}

/** The AI summary, clamped to a few lines when it runs long. */
function Lede({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > LEDE_CHARS
  return (
    <div className="flex flex-col items-start gap-1">
      <p className={cn("text-sm leading-relaxed text-muted-foreground", long && !expanded && "line-clamp-3")}>{text}</p>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-foreground underline-offset-4 fine-hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  )
}

/** Money in / out / net as one hairline row, each with its week-on-week change. */
function Figures({ insight }: { insight: Insight }) {
  const m = insight.metrics
  const figures: { label: string; delta: InsightDelta }[] = [
    { label: "Money in", delta: m.moneyIn },
    { label: "Money out", delta: m.moneyOut },
    { label: "Net", delta: m.net },
  ]
  return (
    <dl className="grid grid-cols-3 divide-x border-y">
      {figures.map((f) => (
        <div key={f.label} className="flex min-w-0 flex-col gap-1 py-3 pr-3 not-first:pl-3">
          <dt className="text-xs text-muted-foreground">{f.label}</dt>
          <dd className="truncate text-sm font-semibold tabular-nums">{formatCurrency(f.delta.current, insight.currency)}</dd>
          <Change pct={f.delta.changePct} />
        </div>
      ))}
    </dl>
  )
}

function Change({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-xs text-muted-foreground">No prior week</span>
  if (pct === 0) return <span className="text-xs text-muted-foreground">Flat</span>
  const Icon = pct > 0 ? ArrowUpRight01Icon : ArrowDownRight01Icon
  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground tabular-nums">
      <Icon size={12} className="shrink-0" />
      {Math.abs(pct)}%
    </span>
  )
}

function SummarySkeleton() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-16 w-full animate-pulse rounded bg-muted/60" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  )
}
