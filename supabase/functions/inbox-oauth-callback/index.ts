// Public passthrough: Google redirects here after the user approves (or
// denies) Gmail access. This function does NOT decrypt state, call Google,
// or touch the DB — it only forwards the redirect params to the authenticated
// SPA route (/inbox/oauth-complete), which calls the protected
// inbox-oauth-finish function with the caller's real session. That function
// re-derives the caller's org and rejects if it doesn't match the org
// encoded in `state`, which is what actually closes the CSRF hole — nothing
// security-sensitive happens in this function anymore.

const APP_URL = Deno.env.get("APP_URL") ?? "https://app.travadabooks.com"

Deno.serve((req) => {
  const params = new URL(req.url).searchParams
  const qs = new URLSearchParams()
  const code = params.get("code")
  const state = params.get("state")
  const error = params.get("error")
  if (code) qs.set("code", code)
  if (state) qs.set("state", state)
  if (error) qs.set("error", error)

  return new Response(null, {
    status: 302,
    headers: { Location: `${APP_URL}/inbox/oauth-complete?${qs.toString()}` },
  })
})
