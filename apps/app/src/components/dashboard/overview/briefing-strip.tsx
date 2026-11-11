import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { Card } from "@travada-books/ui/components/card"
import { Button } from "@travada-books/ui/components/button"
import { Skeleton } from "@travada-books/ui/components/skeleton"
import { SparklesIcon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import {
  CASH_CALENDAR_ANCHOR,
  briefingQueryKey,
  getDashboardBriefing,
  type BriefingItem,
  type BriefingTone,
} from "@/lib/queries/briefing"
import { useCashForecast } from "./use-cash-forecast"

const TONE_DOT: Record<BriefingTone, string> = {
  urgent: "bg-destructive",
  heads_up: "bg-amber-500",
  good: "bg-green-500",
}

const TONE_LABEL: Record<BriefingTone, string> = {
  urgent: "Urgent",
  heads_up: "Heads-up",
  good: "All good",
}

type BriefingStripProps = {
  orgId: string
  /** Org base currency — the forecast is computed in it. */
  currency: string
  displayCurrency: string
  fxRate: number
}

export function BriefingStrip({ orgId, currency, displayCurrency, fxRate }: BriefingStripProps) {
  const forecastQuery = useCashForecast(orgId, currency)
  const forecast = forecastQuery.data

  const briefingQuery = useQuery({
    // dataUpdatedAt keeps the briefing in step with a refetched forecast.
    queryKey: [...briefingQueryKey(orgId, displayCurrency, fxRate, forecast?.today ?? ""), forecastQuery.dataUpdatedAt],
    queryFn: () => getDashboardBriefing(orgId, forecast!, { displayCurrency, fxRate }),
    enabled: forecast != null,
    staleTime: Infinity,
  })

  const isLoading = forecastQuery.isLoading || (forecast != null && briefingQuery.isLoading)
  const isError = forecastQuery.isError || briefingQuery.isError

  return (
    <Card className="w-full gap-0 py-0">
      <div className="flex items-center gap-1.5 border-b px-4 py-2.5">
        <SparklesIcon size={13} className="text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Briefing</span>
      </div>

      {isLoading ? (
        <ul className="divide-y">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="size-1.5 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className={cn("h-3.5 animate-pulse rounded-md bg-muted", i === 1 ? "w-1/2" : "w-2/3")} />
              <Skeleton className="ml-auto h-8 w-24 shrink-0" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <p className="flex-1 text-sm text-muted-foreground">Couldn't put together your briefing.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              forecastQuery.refetch()
              briefingQuery.refetch()
            }}
          >
            Try again
          </Button>
        </div>
      ) : (
        <ul className="divide-y">
          {(briefingQuery.data?.items ?? []).map((item) => (
            <BriefingRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function scrollToAnchor(hash: string) {
  document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function BriefingRow({ item }: { item: BriefingItem }) {
  const { action } = item
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
      <span
        aria-label={TONE_LABEL[item.tone]}
        className={cn("size-1.5 shrink-0 rounded-full transition-colors duration-200", TONE_DOT[item.tone])}
      />
      <p className="min-w-0 flex-1 text-sm">{item.text}</p>
      {action &&
        (action.href === CASH_CALENDAR_ANCHOR ? (
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => scrollToAnchor(action.href)}>
            {action.label}
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="ml-auto" render={<Link to={action.href} />}>
            {action.label}
          </Button>
        ))}
    </li>
  )
}
