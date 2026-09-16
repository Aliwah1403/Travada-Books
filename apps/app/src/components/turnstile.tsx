import { useEffect, useRef } from "react"

/**
 * Cloudflare Turnstile widget — bot protection for auth flows.
 *
 * Renders only when VITE_TURNSTILE_SITE_KEY is set, so the app keeps working
 * before keys are provisioned. Once the site key (client) + secret (Supabase)
 * are in place and captcha is enabled in config.toml, Supabase Auth rejects any
 * signup / sign-in / password-reset request that doesn't include a valid token.
 *
 * Added after a signup-abuse incident on 2026-07-06 (53 bot accounts in 4 min).
 */

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

export const TURNSTILE_ENABLED = Boolean(SITE_KEY)

interface TurnstileWidget {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string
      callback: (token: string) => void
      "expired-callback"?: () => void
      "error-callback"?: () => void
      theme?: "auto" | "light" | "dark"
    }
  ) => string
  remove: (id: string) => void
  reset: (id?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileWidget
    __turnstileScriptLoading?: Promise<void>
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (window.__turnstileScriptLoading) return window.__turnstileScriptLoading

  window.__turnstileScriptLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Turnstile"))
    document.head.appendChild(script)
  })
  return window.__turnstileScriptLoading
}

interface TurnstileProps {
  /** Called with a fresh token on success, or "" when it expires / errors. */
  onVerify: (token: string) => void
}

export function Turnstile({ onVerify }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => onVerify(token),
          "expired-callback": () => onVerify(""),
          "error-callback": () => onVerify(""),
          theme: "auto",
        })
      })
      .catch(() => {
        // Script blocked / offline — leave token empty so the form stays gated.
        if (!cancelled) onVerify("")
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
    // onVerify is intentionally not a dep — the widget is rendered once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!SITE_KEY) return null

  return <div ref={containerRef} className="flex justify-center" />
}
