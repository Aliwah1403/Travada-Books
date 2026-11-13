import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { Button } from "@travada-books/ui/components/button"
import { cn } from "@travada-books/ui/lib/utils"
import { localToday } from "@/lib/queries/forecast"
import { getOverviewStory, type StoryPart } from "@/lib/queries/overview-story"
import { useCashStory, useOverviewIncome } from "./use-overview-data"

type StoryHeadlineProps = {
  orgId: string
  /** Org base currency. */
  currency: string
  from: string
  to: string
  displayCurrency: string
  fxRate: number
}

/** The Overview's lede — a few plain sentences about the range, numbers inline. */
export function StoryHeadline({ orgId, currency, from, to, displayCurrency, fxRate }: StoryHeadlineProps) {
  const today = localToday()
  const income = useOverviewIncome(orgId, from, to, today)
  const cash = useCashStory(orgId, currency)
  // The forward-looking clause is optional — don't hold the lede for it.
  const cashSettled = !cash.isLoading

  const story = useQuery({
    queryKey: [
      "overview-story",
      orgId,
      from,
      to,
      displayCurrency,
      fxRate,
      income.dataUpdatedAt,
      cash.data?.todayBalance ?? null,
      cash.data?.stats.lowest.date ?? null,
    ],
    queryFn: () => getOverviewStory(orgId, income.data!, cash.data, { displayCurrency, fxRate }),
    enabled: income.data != null && cashSettled,
    staleTime: Infinity,
  })

  if (income.isError || story.isError) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">Couldn't put your summary together.</p>
        <Button size="sm" variant="outline" onClick={() => income.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!story.data) {
    return (
      <div className="flex max-w-3xl flex-col gap-2.5 py-1" aria-busy="true">
        <div className="h-5 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-5 w-11/12 animate-pulse rounded-md bg-muted" />
        <div className="h-5 w-2/3 animate-pulse rounded-md bg-muted" />
      </div>
    )
  }

  return (
    <p className="max-w-3xl text-base/relaxed text-pretty text-foreground/80 sm:text-lg/relaxed">
      {story.data.sentences.map((sentence, i) => (
        <span key={i}>
          {i > 0 && " "}
          {sentence.map((part, j) => (
            <Part key={j} part={part} />
          ))}
        </span>
      ))}
    </p>
  )
}

function Part({ part }: { part: StoryPart }) {
  if (typeof part === "string") return <>{part}</>
  const className = cn(
    "font-medium text-foreground",
    part.tone === "positive" && "text-green-600 dark:text-green-400",
    part.tone === "negative" && "text-destructive"
  )
  if (part.href) {
    return (
      <Link
        to={part.href}
        className={cn(className, "underline decoration-foreground/20 underline-offset-4 transition-colors fine-hover:decoration-foreground/60")}
      >
        {part.text}
      </Link>
    )
  }
  return <span className={className}>{part.text}</span>
}
