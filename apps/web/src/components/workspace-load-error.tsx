import { useState } from "react";
import { Button } from "@travada-books/ui/components/button";
import { Alert01Icon } from "@travada-books/ui/icons";

type WorkspaceLoadErrorProps = {
  onRetry: () => Promise<void>;
};

export function WorkspaceLoadError({ onRetry }: WorkspaceLoadErrorProps) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Alert01Icon className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="text-sm font-medium">Couldn't load your workspace</h1>
        <p className="text-xs text-muted-foreground">
          Something went wrong reaching our servers. Check your connection and try again.
        </p>
      </div>
      <Button size="sm" onClick={handleRetry} disabled={retrying}>
        {retrying ? (
          <>
            <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Retrying…
          </>
        ) : (
          "Try again"
        )}
      </Button>
    </div>
  );
}
