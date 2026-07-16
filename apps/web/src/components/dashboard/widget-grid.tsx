import { WidgetErrorBoundary } from "@/components/dashboard/widget-error-boundary"

type WidgetGridProps = {
  children: React.ReactNode[]
}

/**
 * Desktop: 4-column grid. Mobile: horizontal snap-scroll row of full-width
 * cards. Each child is wrapped independently in an error boundary so one
 * broken widget never takes down the rest of the grid.
 */
export function WidgetGrid({ children }: WidgetGridProps) {
  return (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
      {children.map((child, i) => (
        <WidgetErrorBoundary key={i}>{child}</WidgetErrorBoundary>
      ))}
    </div>
  )
}
