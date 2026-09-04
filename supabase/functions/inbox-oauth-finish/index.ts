import { getCallerOrgId } from "../_shared/auth.ts"
import { db } from "../_shared/db.ts"
import { decryptOAuthState, encrypt } from "../_shared/crypto.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" }

type GmailState = { orgId: string; provider: "gmail" }

function isGmailState(v: unknown): v is GmailState {
  return (
    typeof v === "object" && v !== null &&
    typeof (v as Record<string, unknown>).orgId === "string" &&
    (v as Record<string, unknown>).provider === "gmail"
  )
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = await getCallerOrgId(req)
    if ("error" in auth) {
      return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })
    }

    const { orgId } = auth

    const { code, state } = await req.json() as { code?: string; state?: string }
    if (!code || !state) {
      return new Response(JSON.stringify({ error: "missing_params" }), { status: 400, headers: jsonHeaders })
    }

    const parsed = await decryptOAuthState(state, isGmailState)
    if (!parsed) {
      return new Response(JSON.stringify({ error: "invalid_state" }), { status: 400, headers: jsonHeaders })
    }

    // THE FIX: the state's orgId must match the caller's real, session-derived
    // org — before any Google call or DB write. Without this, a victim tricked
    // into approving an attacker's OAuth consent screen (a legitimate Google
    // URL carrying the attacker's encrypted state) would have their own Gmail
    // refresh token exchanged and stored under the attacker's org.
    if (parsed.orgId !== orgId) {
      return new Response(JSON.stringify({ error: "org_mismatch" }), { status: 403, headers: jsonHeaders })
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
      console.error("inbox-oauth-finish: token exchange failed:", await tokenRes.text())
      return new Response(JSON.stringify({ error: "token_exchange_failed" }), { status: 502, headers: jsonHeaders })
    }

    const tokens = await tokenRes.json() as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }

    // prompt=consent is set on the authorize URL, so a missing refresh_token is abnormal.
    if (!tokens.refresh_token) {
      return new Response(JSON.stringify({ error: "no_refresh_token" }), { status: 400, headers: jsonHeaders })
    }

    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userinfoRes.ok) {
      console.error("inbox-oauth-finish: userinfo failed:", await userinfoRes.text())
      return new Response(JSON.stringify({ error: "userinfo_failed" }), { status: 502, headers: jsonHeaders })
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
      console.error("inbox-oauth-finish: save failed:", upsertErr.message)
      return new Response(JSON.stringify({ error: "save_failed" }), { status: 500, headers: jsonHeaders })
    }

    // Non-fatal: kick off an immediate full sync so the user sees attachments
    // right away, instead of waiting for the next 6-hourly sync-inbox-accounts
    // cron run to pick this account up.
    try {
      const triggerSecretKey = Deno.env.get("TRIGGER_SECRET_KEY")!
      const res = await fetch("https://api.trigger.dev/api/v1/tasks/sync-inbox-account/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${triggerSecretKey}`,
        },
        body: JSON.stringify({ payload: { inboxAccountId: acct.id, fullSync: true } }),
      })
      if (!res.ok) console.error("inbox-oauth-finish: sync-inbox-account trigger failed:", await res.text())
    } catch (err) {
      console.error("inbox-oauth-finish: sync-inbox-account trigger threw:", err)
    }

    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders })
  } catch (err) {
    console.error("inbox-oauth-finish: unexpected error:", err)
    return new Response(JSON.stringify({ error: "unexpected" }), { status: 500, headers: jsonHeaders })
  }
})
