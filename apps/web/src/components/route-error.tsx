import { useRouteError, isRouteErrorResponse } from "react-router";
import { ErrorFallback } from "@/components/error-fallback";
import { NotFound } from "@/components/not-found";

export function RouteError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound />;
  }

  return <ErrorFallback onReset={() => window.location.reload()} />;
}
