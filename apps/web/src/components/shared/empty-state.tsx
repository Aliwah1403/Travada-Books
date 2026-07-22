import { type Icon } from "@travada-books/ui/icons"

type EmptyStateProps = {
  icon: Icon
  title: string
  description?: string
  action?: React.ReactNode
  /** Smaller padding/icon for use inside cards (e.g. dashboard widgets). */
  compact?: boolean
}

export function EmptyState({ icon: EmptyIcon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center justify-center py-6 text-center animate-in fade-in-0 slide-in-from-bottom-2 duration-300 [animation-timing-function:var(--ease-out)]"
          : "flex flex-col items-center justify-center py-16 text-center animate-in fade-in-0 slide-in-from-bottom-2 duration-300 [animation-timing-function:var(--ease-out)]"
      }
    >
      <div className={compact ? "mb-3 flex size-9 items-center justify-center rounded-full bg-muted" : "mb-4 flex size-12 items-center justify-center rounded-full bg-muted"}>
        <EmptyIcon size={compact ? 16 : 20} className="text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
