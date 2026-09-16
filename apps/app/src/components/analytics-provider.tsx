import { useEffect } from "react"
import { Outlet, useLocation } from "react-router"
import posthog from "posthog-js"

export function AnalyticsProvider() {
  const location = useLocation()

  useEffect(() => {
    if (import.meta.env.PROD) {
      const currentUrl = location.pathname + location.search + location.hash
      try {
        posthog.capture("$pageview", { $current_url: currentUrl })
      } catch (err) {
        console.error("posthog pageview capture failed:", err)
      }
    }
  }, [location.pathname, location.search, location.hash])

  return <Outlet />
}
