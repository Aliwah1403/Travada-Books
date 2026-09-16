import { CheckmarkCircle01Icon } from "@travada-books/ui/icons"
import { Spinner } from "@/components/shared/spinner"
import type { InboxItem } from "@/lib/queries/inbox"

/**
 * Status pill mapped to our inbox_items.status set. Color/label changes
 * crossfade only (transition-colors) per the animation system — no scale,
 * no slide. new/processing render as a skeleton shimmer, not a spinner.
 */
export function InboxStatus({ item }: { item: InboxItem }) {
  if (item.transaction_id || item.status === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 transition-colors duration-200 dark:text-emerald-400">
        <CheckmarkCircle01Icon size={11} />
        Matched
      </span>
    )
  }

  if (item.status === "new" || item.status === "processing") {
    return <div className="h-3 w-16 animate-pulse rounded bg-muted" />
  }

  if (item.status === "analyzing") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors duration-200">
        <Spinner size={10} />
        Analyzing
      </span>
    )
  }

  if (item.status === "suggested_match") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 transition-colors duration-200 dark:text-amber-400">
        <span className="size-1.5 rounded-full bg-amber-500" />
        Suggested match
      </span>
    )
  }

  if (item.status === "no_match") {
    return (
      <span className="text-[10px] font-medium text-muted-foreground transition-colors duration-200">
        No match
      </span>
    )
  }

  if (item.status === "pending") {
    return (
      <span className="text-[10px] font-medium text-muted-foreground transition-colors duration-200">
        Pending
      </span>
    )
  }

  if (item.status === "archived") {
    return (
      <span className="text-[10px] font-medium text-muted-foreground transition-colors duration-200">
        Archived
      </span>
    )
  }

  return null
}
