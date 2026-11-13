import { PostHog } from "posthog-node"

export type Analytics = {
  capture(event: string, distinctId: string, properties?: Record<string, unknown>): void
  captureError(error: unknown, context?: Record<string, unknown>): void
  shutdown(): Promise<void>
}

const noop: Analytics = { capture: () => {}, captureError: () => {}, shutdown: async () => {} }

// Without a key (local dev, tests) analytics and error capture are off.
export function createAnalytics(apiKey: string | undefined, host: string): Analytics {
  if (!apiKey) return noop
  const client = new PostHog(apiKey, { host })

  return {
    capture: (event, distinctId, properties = {}) => client.capture({ event, distinctId, properties }),
    captureError: (error, context = {}) => client.captureException(error, "travada-api", context),
    // Flushes queued events; called on SIGTERM so a deploy doesn't drop them.
    shutdown: () => client.shutdown(),
  }
}
