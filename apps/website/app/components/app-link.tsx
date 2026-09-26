import { useSyncExternalStore, type ComponentProps, type MouseEvent } from "react"

import { captureEvent } from "~/lib/analytics"
import { LOGIN_URL, SIGNUP_URL } from "~/data/site"
import { appendStoredParams } from "~/lib/utm"

export type AppLinkTarget = "signup" | "login"

export type AppLinkLocation =
  | "header"
  | "mobile-nav"
  | "hero"
  | "feature-hero"
  | "integrations"
  | "cta-band"
  | "pricing"

type AppLinkProps = Omit<ComponentProps<"a">, "href"> & {
  to: AppLinkTarget
  location: AppLinkLocation
}

const BASE_HREF: Record<AppLinkTarget, string> = {
  signup: SIGNUP_URL,
  login: LOGIN_URL,
}

// Never notifies — the UTM/ref params a signup link carries don't change
// during a page's lifetime, so there's nothing to subscribe to. Only here
// to satisfy useSyncExternalStore's signature.
function subscribe() {
  return () => {}
}

// Every link from the marketing site into the app renders through here —
// used as the Base UI `render` element on <Button> (see header.tsx,
// home/hero.tsx, home/closing.tsx, feature/feature-page.tsx,
// integrations.tsx, pricing.tsx). It fires
// `website_cta_clicked { cta, location }` via PostHog (a no-op until it's
// loaded, see ~/lib/analytics.ts) and, for signup links only, swaps in the
// UTM-tagged href once hydrated. useSyncExternalStore (rather than
// useState+useEffect) is what keeps this hydration-safe: getServerSnapshot
// is what the prerendered HTML and the first client render both use, so it
// always matches the static SIGNUP_URL and there's no hydration mismatch —
// getSnapshot only takes over, with the appended params, after that.
export function AppLink({ to, location, onClick, children, ...props }: AppLinkProps) {
  const href = useSyncExternalStore(
    subscribe,
    () => (to === "signup" ? appendStoredParams(SIGNUP_URL) : BASE_HREF[to]),
    () => BASE_HREF[to],
  )

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    captureEvent("website_cta_clicked", { cta: to, location })
  }

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  )
}
