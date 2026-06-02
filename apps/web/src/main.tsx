import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import posthog from "posthog-js"
import * as Sentry from "@sentry/react"

import "@travada-books/ui/globals.css"
import { App } from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { TooltipProvider } from "@travada-books/ui/components/tooltip"
import { AuthProvider } from "@/contexts/auth-context.tsx"
import { Toaster } from "sonner"

const posthogKey = import.meta.env.VITE_POSTHOG_KEY
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    debug: import.meta.env.DEV,
  })
}

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
  })
} // end Sentry (prod-only)

const queryClient = new QueryClient()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <App />
              <Toaster richColors position="bottom-right" />
            </TooltipProvider>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
)
