import { Link } from "react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@travada-books/ui/components/card"
import { Skeleton } from "@travada-books/ui/components/skeleton"
import { type Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { ErrorState } from "@/components/shared/error-state"

// ─── In-place loading skeletons ────────────────────────────────────────────
// The old approach swapped the entire `<WidgetCard>` for a generic
// `<WidgetSkeleton>` (a different Card tree) while a query was loading, then
// swapped back once data arrived. On a cold page load that meant every
// widget's title/icon disappeared and reappeared, and the swap's height
// rarely matched the real content's height, causing the whole grid row to
// jump. These pieces let each widget keep its own `<WidgetCard title icon>`
// mounted at all times (title/icon are static, never loading) and skeleton
// only the data-dependent parts, shaped to closely match that widget's real
// content so there's little to no reflow when data arrives.

/** Placeholder for a widget's large headline figure (matches `text-xl font-semibold tracking-tight`). */
export function WidgetHeadlineSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-7 w-28", className)} />
}

/** Placeholder for a small muted text line (matches `text-xs`) — subtitle, delta, or a single list row. */
export function WidgetLineSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-3 w-32", className)} />
}

/** Placeholder for a sparkline chart area. */
export function WidgetChartSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-full", className)} />
}

/** Placeholder for a linear Gauge (DEFAULT_LINEAR_GAUGE_HEIGHT = 24 in notch-gauge-shared.ts). */
export function WidgetGaugeSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-6 w-full rounded-full", className)} />
}

type WidgetCardProps = {
  title: string
  icon: Icon
  /** If set, the whole card becomes a link with press + hover feedback. */
  to?: string
  /** Small indicator rendered next to the title — e.g. for widgets that intentionally ignore the dashboard's date-range filter. */
  badge?: React.ReactNode
  children: React.ReactNode
  className?: string
}

// Applied to the grid/flex item itself (Link or plain div) so mobile
// snap-scroll and desktop grid sizing behave the same whether or not the
// widget is clickable.
const WIDGET_SLOT_CLASSES = "h-full min-w-[85vw] shrink-0 snap-start md:min-w-0 md:shrink"

export function WidgetCard({ title, icon: TitleIcon, to, badge, children, className }: WidgetCardProps) {
  const card = (
    <Card
      className={cn("h-full", to && "transition-[colors,transform] active:scale-[0.97] active:opacity-90", className)}
    >
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <TitleIcon size={16} className="shrink-0 text-muted-foreground" />
        <CardTitle className="truncate">{title}</CardTitle>
        {badge && <div className="ml-auto shrink-0">{badge}</div>}
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
