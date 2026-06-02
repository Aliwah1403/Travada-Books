import { useEffect } from "react"
import { Outlet, useLocation } from "react-router"
import posthog from "posthog-js"

export function AnalyticsProvider() {
  const location = useLocation()

  useEffect(() => {
    if (import.meta.env.PROD) {
      posthog.capture("$pageview", { $current_url: window.location.href })
    }
  }, [location.pathname])

  return <Outlet />
}
