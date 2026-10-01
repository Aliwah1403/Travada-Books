import * as Sentry from "@sentry/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@travada-books/ui/components/card";
import { Button } from "@travada-books/ui/components/button";
import { type Icon } from "@travada-books/ui/icons";
import { ErrorState } from "@/components/shared/error-state";

type ChartCardProps = {
  title: string;
  icon: Icon;
  /** Short context line under the title (e.g. sign convention, methodology note). */
  description?: string;
  children: React.ReactNode;
};

/** Full-width card shell for the Metrics tab — the wide sibling of `WidgetCard`. */
export function ChartCard({
  title,
  icon: TitleIcon,
  description,
  children,
}: ChartCardProps) {
  return (
    <Card className='w-full'>
      <CardHeader className='flex flex-row items-start gap-2 space-y-0'>
        <TitleIcon
          size={16}
          className='mt-0.5 shrink-0 text-muted-foreground'
        />
        <div className='flex flex-col gap-1'>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ChartCardError({
  title,
  icon: TitleIcon,
  onRetry,
}: {
  title: string;
  icon: Icon;
  onRetry: () => void;
}) {
  return (
    <Card className='w-full'>
      <CardHeader className='flex flex-row items-center gap-2 space-y-0'>
        <TitleIcon size={16} className='shrink-0 text-muted-foreground' />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ErrorState
          title="Couldn't load"
          description='Something went wrong.'
          onRetry={onRetry}
          compact
        />
      </CardContent>
    </Card>
  );
}

/**
 * Catches render-time exceptions inside a single metrics chart card so one
 * broken chart never blanks the rest of the tab. Mirrors `WidgetErrorBoundary`
 * but without the mobile snap-scroll slot classes (these cards are full-width).
 */
export function ChartCardErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => (
        <Card className='w-full'>
          <CardContent className='flex flex-col items-center justify-center gap-3 py-16 text-center'>
            <p className='text-xs font-medium'>This chart couldn't load</p>
            <Button size='sm' variant='outline' onClick={resetError}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
