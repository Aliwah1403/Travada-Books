import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { SparklesIcon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { useAuth } from "@/contexts/auth-context"
import { formatCurrency } from "@/lib/format"
import { LogEvents, trackEvent } from "@/lib/analytics"
import { listInsights, type Insight, type InsightDelta } from "@/lib/queries/insights"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// Weeks are Monday to Sunday in UTC, so the label is built from the date string
// itself; going through Date would shift it for viewers west of UTC.
function periodLabel(start: string, end: string): string {
  const f = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`
  return `${f(start)} to ${f(end)}`
}

function changeText(d: InsightDelta): string | null {
  if (d.changePct == null) return null
  if (d.changePct === 0) return "Unchanged on the week before"
  return `${d.changePct > 0 ? "Up" : "Down"} ${Math.abs(d.changePct)}% on the week before`
}

type Figure = { label: string; value: string; change: string | null }

function figuresFor(i: Insight): Figure[] {
  const m = i.metrics
  const c = i.currency
  const out: Figure[] = [
    { label: "Money in", value: formatCurrency(m.moneyIn.current, c), change: changeText(m.moneyIn) },
    { label: "Money out", value: formatCurrency(m.moneyOut.current, c), change: changeText(m.moneyOut) },
    { label: "Net", value: formatCurrency(m.net.current, c), change: changeText(m.net) },
  ]
  if (m.overdue.count > 0) {
    out.push({
      label: "Overdue invoices",
      value: formatCurrency(m.overdue.amount, c),
      change: `${m.overdue.count} ${m.overdue.count === 1 ? "invoice" : "invoices"}`,
    })
  } else {
    out.push({
      label: "Invoices paid",
      value: String(m.invoicesPaid.count),
      change: m.invoicesPaid.count ? formatCurrency(m.invoicesPaid.amount, c) : null,
    })
  }
  return out
}

function InsightsSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3">
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        <div className="h-7 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full max-w-2xl animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 max-w-2xl animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
    </div>
  )
}

export function InsightsPage() {
  const { orgId } = useAuth()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: insights = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["insights", orgId],
    queryFn: () => listInsights(orgId!),
    enabled: !!orgId,
  })

  // Arrived from the weekly email: count it once, then drop only this param.
  const [searchParams, setSearchParams] = useSearchParams()
  const emailTracked = useRef(false)
  useEffect(() => {
    if (searchParams.get("from") !== "weekly-insight") return
    if (!emailTracked.current) {
      emailTracked.current = true
      trackEvent(LogEvents.InsightEmailOpened, {})
    }
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.delete("from")
        return params
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  const latest = insights[0] ?? null
  const current = useMemo(
    () => insights.find((i) => i.id === selectedId) ?? latest,
    [insights, selectedId, latest],
  )

  const viewedId = useRef<string | null>(null)
  useEffect(() => {
    if (!current || viewedId.current === current.id) return
    viewedId.current = current.id
    trackEvent(LogEvents.InsightViewed, {
      period_start: current.period_start,
      is_latest: current.id === latest?.id,
    })
  }, [current, latest])

  if (isLoading) return <InsightsSkeleton />

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState onRetry={refetch} />
      </div>
    )
  }

  if (!current) {
    return (
      <div className="p-6">
        <EmptyState
          icon={SparklesIcon}
          title="No summaries yet"
          description="Your first summary arrives the Monday after your first week of activity."
        />
      </div>
    )
  }

  const figures = figuresFor(current)
  const older = insights.filter((i) => i.id !== current.id)

  return (
    <div className="flex flex-col gap-8 p-6">
      <section className="flex max-w-3xl flex-col gap-3">
        <p className="text-xs text-muted-foreground">{periodLabel(current.period_start, current.period_end)}</p>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">{current.content.title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{current.content.summary}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {figures.map((f) => (
          <div key={f.label} className="flex flex-col gap-1 rounded-lg border bg-card p-4">
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <span className="text-lg font-semibold tabular-nums">{f.value}</span>
            <span className="min-h-4 text-xs text-muted-foreground">{f.change}</span>
          </div>
        ))}
      </section>

      {current.content.actions.length > 0 && (
        <section className="flex max-w-3xl flex-col gap-2">
          <h2 className="text-sm font-medium">Worth doing this week</h2>
          <ul className="flex flex-col divide-y rounded-lg border">
            {current.content.actions.map((a) => (
              <li key={a.id}>
                <Link
                  to={a.href}
                  onClick={() => trackEvent(LogEvents.InsightActionClicked, { action_id: a.id })}
                  className="block px-4 py-3 text-sm transition-colors active:opacity-80 fine-hover:bg-muted"
                >
                  {a.text}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {older.length > 0 && (
        <section className="flex max-w-3xl flex-col gap-2">
          <h2 className="text-sm font-medium">Earlier weeks</h2>
          <ul className="flex flex-col divide-y rounded-lg border">
            {older.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(i.id)
                    window.scrollTo({ top: 0 })
                  }}
                  className={cn(
                    "flex w-full items-baseline justify-between gap-4 px-4 py-3 text-left text-sm transition-colors active:opacity-80 fine-hover:bg-muted",
                  )}
                >
                  <span className="truncate">{i.content.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {periodLabel(i.period_start, i.period_end)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
