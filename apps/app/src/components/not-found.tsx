import { Link } from "react-router";
import { Button } from "@travada-books/ui/components/button";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-4xl font-semibold text-muted-foreground">404</p>
      <div className="space-y-1">
        <h1 className="text-sm font-medium">Page not found</h1>
        <p className="text-xs text-muted-foreground">
          The page you're looking for doesn't exist or may have been moved.
        </p>
      </div>
      <Button size="sm" render={<Link to="/invoices" />}>
        Back to invoices
      </Button>
    </div>
  );
}
