import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@travada-books/ui/components/card"
import { Button } from "@travada-books/ui/components/button"
import { ArrowLeft01Icon, ArrowRight01Icon, SparklesIcon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { openAssistant } from "@/lib/assistant-launcher"
import { localToday } from "@/lib/queries/forecast"
import { listInsights } from "@/lib/queries/insights"
import {
  composeOverviewInsights,
  expenseSpikeQueryKey,
  getExpenseSpikeInput,
  type OverviewInsightCard,
} from "@/lib/queries/overview-insights"
import { useCashForecast } from "./use-cash-forecast"
import { useOverviewIncome } from "./use-overview-data"
import { INSIGHT_PARAM } from "./weekly-summary-sheet"

const STALE_TIME = 5 * 60 * 1000

type InsightsCarouselProps = {
  orgId: string
  /** Org base currency. */
  currency: string
  from: string
  to: string
  displayCurrency: string
  fxRate: number
}

export function InsightsCarousel({ orgId, currency, from, to, displayCurrency, fxRate }: InsightsCarouselProps) {
  const today = localToday()
  const [, setSearchParams] = useSearchParams()
  const openSummary = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set(INSIGHT_PARAM, id)
      return next
    })
  const stored = useQuery({
    queryKey: ["insights", orgId],
    queryFn: () => listInsights(orgId),
    staleTime: STALE_TIME,
  })
  const income = useOverviewIncome(orgId, from, to, today)
  const forecast = useCashForecast(orgId, currency)
  const spike = useQuery({
    queryKey: expenseSpikeQueryKey(orgId, today),
    queryFn: () => getExpenseSpikeInput(orgId, today),
    staleTime: STALE_TIME,
  })

  // Each source is optional — a failed one just contributes no cards.
  const settled = !stored.isLoading && !income.isLoading && !forecast.isLoading && !spike.isLoading
  const cards = useMemo(
    () =>
      settled
        ? composeOverviewInsights(
            {
              stored: stored.data ?? [],
              income: income.data ?? null,
              forecast: forecast.data ?? null,
              spike: spike.data ?? null,
            },
            { displayCurrency, fxRate }
          )
        : null,
    [settled, stored.data, income.data, forecast.data, spike.data, displayCurrency, fxRate]
  )

  return (
    <Card className="h-full w-full min-w-0">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <SparklesIcon size={16} className="shrink-0 text-muted-foreground" />
        <CardTitle className="flex-1">Insights</CardTitle>
        <Button
          size="sm"
          onClick={() => openAssistant("How is my business doing right now? Anything I should act on?")}
        >
          <SparklesIcon data-icon="inline-start" />
          Ask Travada
        </Button>
      </CardHeader>
      <CardContent className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        {cards == null ? (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1].map((i) => (
              <div
                key={i}
                className={cn(
                  "flex h-36 w-[85%] shrink-0 flex-col gap-2.5 rounded-lg border p-3 sm:w-[calc(50%-6px)]",
                  i === 1 && "hidden sm:flex"
                )}
              >
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nothing stands out yet. Insights appear here as invoices, payments and expenses come in.
          </p>
        ) : (
          <Track cards={cards} onReadSummary={openSummary} />
        )}
      </CardContent>
    </Card>
  )
}

function Track({ cards, onReadSummary }: { cards: OverviewInsightCard[]; onReadSummary: (id: string) => void }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const update = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const first = el.firstElementChild as HTMLElement | null
    const step = first ? first.offsetWidth + 12 : el.clientWidth
    setActive(Math.min(cards.length - 1, Math.round(el.scrollLeft / Math.max(1, step))))
    setAtStart(el.scrollLeft <= 2)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2)
  }, [cards.length])

  useEffect(() => {
    update()
    const el = scrollerRef.current
    if (!el) return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [update])

  const scrollToIndex = (index: number) => {
    const el = scrollerRef.current
    const target = el?.children[index] as HTMLElement | undefined
    if (!el || !target) return
    el.scrollTo({ left: target.offsetLeft - el.offsetLeft, behavior: "smooth" })
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={scrollerRef}
        onScroll={update}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-roledescription="carousel"
        aria-label="Insights"
      >
        {cards.map((card, i) => (
          <InsightTile key={card.id} card={card} index={i} total={cards.length} onReadSummary={onReadSummary} />
        ))}
      </div>

      {cards.length > 1 && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5">
            {cards.map((card, i) => (
              <button
                key={card.id}
                type="button"
                aria-label={`Go to insight ${i + 1}`}
                aria-current={i === active}
                onClick={() => scrollToIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-colors duration-200",
                  i === active ? "w-4 bg-foreground/70" : "w-1.5 bg-foreground/20 fine-hover:bg-foreground/40"
                )}
              />
            ))}
          </div>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Previous insight"
            disabled={atStart}
            onClick={() => scrollToIndex(Math.max(0, active - 1))}
          >
            <ArrowLeft01Icon />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Next insight"
            disabled={atEnd}
            onClick={() => scrollToIndex(Math.min(cards.length - 1, active + 1))}
          >
            <ArrowRight01Icon />
          </Button>
        </div>
      )}
    </div>
  )
}

function InsightTile({
  card,
  index,
  total,
  onReadSummary,
}: {
  card: OverviewInsightCard
  index: number
  total: number
  onReadSummary: (id: string) => void
}) {
  return (
    <article
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${total}`}
      className="flex w-[85%] shrink-0 snap-start flex-col gap-1.5 rounded-lg border bg-muted/20 p-3 sm:w-[calc(50%-6px)]"
    >
      <p className="flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
        {card.source === "ai" && <SparklesIcon size={11} className="shrink-0" />}
        <span className="truncate">{card.eyebrow}</span>
      </p>
      <h3 className="text-sm font-medium text-pretty">{card.title}</h3>
      <p className="line-clamp-3 text-xs/relaxed text-muted-foreground">{card.text}</p>
      <div className="mt-auto flex min-w-0 items-center pt-1.5">
        {card.insightId && (
          <Button
            size="sm"
            variant="ghost"
            className="-ml-2.5 underline underline-offset-4"
            onClick={() => onReadSummary(card.insightId!)}
          >
            Read the summary
          </Button>
        )}
        {card.action && (
          <Button
            size="sm"
            variant="ghost"
            nativeButton={false}
            render={<Link to={card.action.href} />}
            className="-ml-2.5 max-w-full min-w-0 underline underline-offset-4"
          >
            <span className="truncate">{card.action.label}</span>
          </Button>
        )}
      </div>
    </article>
  )
}
