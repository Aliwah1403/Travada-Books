import { type Icon } from "@travada-books/ui/icons"

type EmptyStateProps = {
  icon: Icon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: EmptyIcon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <EmptyIcon size={20} className="text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
