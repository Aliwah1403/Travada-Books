// Thin wrapper around a PostHog instance that may or may not be loaded yet.
// `~/components/analytics.tsx` lazily imports posthog-js (prod + key only)
// and registers the instance here; every other call site (AppLink, page
// components) just calls `captureEvent` and no-ops until that's happened —
// nothing else needs to know whether PostHog is loaded.
type PostHogLike = {
  capture: (event: string, properties?: Record<string, unknown>) => void
}

let instance: PostHogLike | null = null

export function setAnalyticsInstance(next: PostHogLike | null) {
  instance = next
}

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (!instance) return
  try {
    instance.capture(event, properties)
  } catch (err) {
    console.error(`posthog capture failed for "${event}":`, err)
  }
}
