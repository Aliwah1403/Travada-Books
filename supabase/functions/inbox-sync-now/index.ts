import { getCallerOrgId } from "../_shared/auth.ts"
import { db } from "../_shared/db.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = await getCallerOrgId(req)
    if ("error" in auth) {
      return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })
    }

    const { orgId } = auth
    const { accountId } = await req.json() as { accountId?: string }

    if (!accountId || typeof accountId !== "string") {
      return new Response(JSON.stringify({ error: "accountId required" }), { status: 400, headers: jsonHeaders })
    }

    // Verify the account belongs to this org before firing anything. Same
    // 404 response whether the id doesn't exist at all or belongs to another
    // org — never leak which case it is.
    const { data: account } = await db
      .from("inbox_accounts")
      .select("org_id")
      .eq("id", accountId)
      .single()

    if (!account || account.org_id !== orgId) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: jsonHeaders })
    }

    // Non-fatal: this is a manual "sync now" button, not a blocking operation —
    // log but don't fail the response if the trigger call itself errors,
    // mirroring inbox-oauth-finish's post-connect trigger call.
    try {
      const triggerSecretKey = Deno.env.get("TRIGGER_SECRET_KEY")!
      const res = await fetch("https://api.trigger.dev/api/v1/tasks/sync-inbox-account/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${triggerSecretKey}`,
        },
        body: JSON.stringify({ payload: { inboxAccountId: accountId, fullSync: true } }),
      })
      if (!res.ok) console.error("inbox-sync-now: sync-inbox-account trigger failed:", await res.text())
    } catch (err) {
      console.error("inbox-sync-now: sync-inbox-account trigger threw:", err)
    }

    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders })
  } catch (err) {
    console.error("inbox-sync-now error:", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: jsonHeaders })
  }
})
