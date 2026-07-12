import { Button } from "@travada-books/ui/components/button"
import { Alert01Icon } from "@travada-books/ui/icons"

type ErrorStateProps = {
  title?: string
  description?: string
  onRetry: () => void
}

export function ErrorState({
  title = "Couldn't load this data",
  description = "Something went wrong. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in-0 slide-in-from-bottom-2 duration-300 [animation-timing-function:var(--ease-out)]">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <Alert01Icon size={20} className="text-muted-foreground" />
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
