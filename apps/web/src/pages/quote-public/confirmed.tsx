import { useParams, useSearchParams, Link } from "react-router";
import { CheckmarkCircle01Icon, Cancel01Icon, Download01Icon } from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";

export function QuoteConfirmedPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const action = searchParams.get("action");
  const isAccepted = action === "accepted";

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="flex items-center border-b bg-background px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold">
            TB
          </div>
          <span className="text-sm font-semibold">Travada Books</span>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          {isAccepted ? (
            <>
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckmarkCircle01Icon
                  size={28}
                  className="text-green-600 dark:text-green-400"
                />
              </div>
              <h1 className="mt-5 text-xl font-semibold">Quote accepted!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We've received your confirmation. The team will send your invoice
                shortly — keep an eye on your inbox.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Link to={`/q/${token}`}>
                  <Button variant="outline" className="gap-1.5">
                    <Download01Icon size={13} />
                    Download Quote PDF
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
                <Cancel01Icon size={28} className="text-muted-foreground" />
              </div>
              <h1 className="mt-5 text-xl font-semibold">Thanks for letting us know</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We've received your response. The team will review your feedback
                and may reach out with a revised proposal.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Link to={`/q/${token}`}>
                  <Button variant="outline" size="sm">
                    Back to quote
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
