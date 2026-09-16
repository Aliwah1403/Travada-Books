import * as Sentry from "@sentry/react"
import { Card, CardContent } from "@travada-books/ui/components/card"
import { Button } from "@travada-books/ui/components/button"
import { Alert01Icon } from "@travada-books/ui/icons"

type WidgetErrorBoundaryProps = {
  children: React.ReactNode
}

/**
 * Catches render-time exceptions inside a single dashboard widget so one
 * broken card never blanks the rest of the grid. Query-level failures
 * (RPC errors) are handled separately via each widget's own `isError`
 * state — this only guards against unexpected render crashes.
 */
export function WidgetErrorBoundary({ children }: WidgetErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => (
        <div className="h-full min-w-[85vw] shrink-0 snap-start md:min-w-0 md:shrink">
          <Card className="h-full">
            <CardContent className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <Alert01Icon size={18} className="text-muted-foreground" />
              </div>
              <p className="text-xs font-medium">This widget couldn't load</p>
              <Button size="sm" variant="outline" onClick={resetError}>
                Try again
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}
