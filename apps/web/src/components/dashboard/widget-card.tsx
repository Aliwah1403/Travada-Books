import { Link } from "react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@travada-books/ui/components/card"
import { Skeleton } from "@travada-books/ui/components/skeleton"
import { type Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { ErrorState } from "@/components/shared/error-state"

type WidgetCardProps = {
  title: string
  icon: Icon
  /** If set, the whole card becomes a link with press + hover feedback. */
  to?: string
  children: React.ReactNode
  className?: string
}

// Applied to the grid/flex item itself (Link or plain div) so mobile
// snap-scroll and desktop grid sizing behave the same whether or not the
// widget is clickable.
const WIDGET_SLOT_CLASSES = "h-full min-w-[85vw] shrink-0 snap-start md:min-w-0 md:shrink"

export function WidgetCard({ title, icon: TitleIcon, to, children, className }: WidgetCardProps) {
  const card = (
    <Card
      className={cn("h-full", to && "transition-[colors,transform] active:scale-[0.97] active:opacity-90", className)}
    >
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <TitleIcon size={16} className="shrink-0 text-muted-foreground" />
        <CardTitle className="truncate">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )

  if (!to) return <div className={WIDGET_SLOT_CLASSES}>{card}</div>

  return (
    <Link
      to={to}
      className={cn(
        "block rounded-lg fine-hover:ring-1 fine-hover:ring-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        WIDGET_SLOT_CLASSES
      )}
    >
      {card}
    </Link>
  )
}

export function WidgetSkeleton() {
  return (
    <div className={WIDGET_SLOT_CLASSES}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-3.5 w-24" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    </div>
  )
}

export function WidgetError({ title, icon: TitleIcon, onRetry }: { title: string; icon: Icon; onRetry: () => void }) {
  return (
    <div className={WIDGET_SLOT_CLASSES}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <TitleIcon size={16} className="shrink-0 text-muted-foreground" />
          <CardTitle className="truncate">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState title="Couldn't load" description="Something went wrong." onRetry={onRetry} compact />
        </CardContent>
      </Card>
    </div>
  )
}
