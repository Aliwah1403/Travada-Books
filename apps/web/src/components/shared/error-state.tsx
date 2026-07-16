import { Button } from "@travada-books/ui/components/button"
import { Alert01Icon } from "@travada-books/ui/icons"

type ErrorStateProps = {
  title?: string
  description?: string
  onRetry: () => void
  /** Smaller padding/icon for use inside cards (e.g. dashboard widgets). */
  compact?: boolean
}

export function ErrorState({
  title = "Couldn't load this data",
  description = "Something went wrong. Please try again.",
  onRetry,
  compact,
}: ErrorStateProps) {
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center justify-center py-6 text-center animate-in fade-in-0 slide-in-from-bottom-2 duration-300 [animation-timing-function:var(--ease-out)]"
          : "flex flex-col items-center justify-center py-16 text-center animate-in fade-in-0 slide-in-from-bottom-2 duration-300 [animation-timing-function:var(--ease-out)]"
      }
    >
      <div className={compact ? "mb-3 flex size-9 items-center justify-center rounded-full bg-muted" : "mb-4 flex size-12 items-center justify-center rounded-full bg-muted"}>
        <Alert01Icon size={compact ? 16 : 20} className="text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-4">
        <Button size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  )
}
