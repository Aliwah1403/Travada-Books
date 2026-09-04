import { db } from "../_shared/db.ts"
import { decryptOAuthState, encrypt } from "../_shared/crypto.ts"

const APP_URL = Deno.env.get("APP_URL") ?? "https://books.travadasys.com"

type GmailState = { orgId: string; provider: "gmail" }

function isGmailState(v: unknown): v is GmailState {
  return (
    typeof v === "object" && v !== null &&
    typeof (v as Record<string, unknown>).orgId === "string" &&
    (v as Record<string, unknown>).provider === "gmail"
  )
}

function redirect(path: string): Response {
  return new Response(null, { status: 302, headers: { Location: `${APP_URL}${path}` } })
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return redirect("/inbox?error=invalid_request")

  try {
    const params = new URL(req.url).searchParams
    const code = params.get("code")
    const stateParam = params.get("state")
    const oauthError = params.get("error")

    const parsed = stateParam ? await decryptOAuthState(stateParam, isGmailState) : null
    if (!parsed) return redirect("/inbox?error=invalid_state")

    if (oauthError || !code) {
      return redirect(`/inbox?error=${encodeURIComponent(oauthError ?? "no_code")}`)
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        code,
        redirect_uri: Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI")!,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenRes.ok) {
      console.error("inbox-oauth-callback: token exchange failed:", await tokenRes.text())
      return redirect("/inbox?error=token_exchange_failed")
    }

    const tokens = await tokenRes.json() as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }

    // prompt=consent is set on the authorize URL, so a missing refresh_token is abnormal.
    if (!tokens.refresh_token) return redirect("/inbox?error=no_refresh_token")

    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userinfoRes.ok) {
      console.error("inbox-oauth-callback: userinfo failed:", await userinfoRes.text())
      return redirect("/inbox?error=userinfo_failed")
    }

    const { sub, email } = await userinfoRes.json() as { sub: string; email: string }

    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const { data: acct, error: upsertErr } = await db
      .from("inbox_accounts")
      .upsert({
        org_id: parsed.orgId,
        provider: "gmail",
        email,
        external_id: sub,
        access_token: await encrypt(tokens.access_token),
        refresh_token: await encrypt(tokens.refresh_token),
        expiry_date: expiryDate,
        status: "connected",
        error_message: null,
        last_accessed: new Date().toISOString(),
      }, { onConflict: "org_id,email" })
      .select("id")
      .single()

    if (upsertErr) {
      console.error("inbox-oauth-callback: save failed:", upsertErr.message)
      return redirect("/inbox?error=save_failed")
    }

    // Non-fatal: initial-inbox-sync doesn't exist until step ⑥, and the global
    // sync cron picks the account up regardless.
    try {
      const triggerSecretKey = Deno.env.get("TRIGGER_SECRET_KEY")!
      const res = await fetch("https://api.trigger.dev/api/v1/tasks/initial-inbox-sync/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${triggerSecretKey}`,
        },
        body: JSON.stringify({ payload: { inboxAccountId: acct.id } }),
      })
      if (!res.ok) console.error("inbox-oauth-callback: initial-inbox-sync trigger failed:", await res.text())
    } catch (err) {
      console.error("inbox-oauth-callback: initial-inbox-sync trigger threw:", err)
    }

    return redirect("/inbox?connected=gmail")
  } catch (err) {
    console.error("inbox-oauth-callback: unexpected error:", err)
    return redirect("/inbox?error=unexpected")
  }
})
