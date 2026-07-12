import { Button } from "@travada-books/ui/components/button";
import { Alert01Icon } from "@travada-books/ui/icons";

type ErrorFallbackProps = {
  onReset?: () => void;
};

export function ErrorFallback({ onReset }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Alert01Icon className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="text-sm font-medium">Something went wrong</h1>
        <p className="text-xs text-muted-foreground">
          An unexpected error occurred. Try reloading the page — if it keeps happening, we've
          been notified.
        </p>
      </div>
      <Button size="sm" onClick={() => (onReset ? onReset() : window.location.reload())}>
        Reload page
      </Button>
    </div>
  );
}
