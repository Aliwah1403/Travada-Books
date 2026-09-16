import { useEffect, useRef } from "react"
import { useLocation } from "react-router"

import { captureEvent, setAnalyticsInstance } from "~/lib/analytics"
import { captureUtmParams } from "~/lib/utm"

// Client-only, lazy: PostHog is dynamically imported (its own chunk — never
// part of the initial bundle) only when built for production and a project
// key is configured. Mirrors apps/app/src/main.tsx (init) +
// components/analytics-provider.tsx (per-route pageview) combined into one,
// since this site has no top-level Outlet wrapper route to hang the
// provider off. Must never block render or throw.
export function Analytics() {
  const location = useLocation()
  const initialized = useRef(false)

  useEffect(() => {
    captureUtmParams()
  }, [])

  useEffect(() => {
    if (initialized.current) return
    if (!import.meta.env.PROD) return
    const key = import.meta.env.VITE_POSTHOG_KEY
    if (!key) return
    initialized.current = true

    import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.init(key, {
          api_host: import.meta.env.VITE_POSTHOG_HOST,
          capture_pageview: false,
          capture_pageleave: true,
        })
        setAnalyticsInstance(posthog)
        captureEvent("$pageview", {
          $current_url: location.pathname + location.search + location.hash,
        })
      })
      .catch((err) => {
        console.error("posthog init failed:", err)
      })
    // Runs once on mount only — the initial pageview above intentionally
    // uses the location captured at that point; every later navigation is
    // handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!import.meta.env.PROD) return
    captureEvent("$pageview", {
      $current_url: location.pathname + location.search + location.hash,
    })
  }, [location.pathname, location.search, location.hash])

  return null
}
