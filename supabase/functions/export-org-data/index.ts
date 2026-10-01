import { getCallerOrgId } from "../_shared/auth.ts"
import { db } from "../_shared/db.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const ONE_HOUR_MS = 60 * 60 * 1000
const MANUAL_EXPORT_EXPIRES_IN_DAYS = 7

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = await getCallerOrgId(req)
    if ("error" in auth) return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })

    const { orgId, userId } = auth

    const { data: membership, error: membershipError } = await db
      .from("organization_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single()

    if (membershipError || !membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    if (membership.role !== "owner") {
      return new Response(JSON.stringify({ error: "Only owners can export organisation data" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: caller, error: callerError } = await db
      .from("users")
      .select("email")
      .eq("id", userId)
      .single()

    if (callerError || !caller?.email) {
      console.error("export-org-data: could not resolve caller email:", callerError?.message)
      return new Response(JSON.stringify({ error: "Could not resolve your email address" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: org, error: orgError } = await db
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single()

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: "Organisation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Avoid piling up duplicate exports if one is already running.
    const oneHourAgo = new Date(Date.now() - ONE_HOUR_MS).toISOString()
    const { data: recent, error: recentError } = await db
      .from("org_data_exports")
      .select("id")
      .eq("org_id", orgId)
      .eq("status", "processing")
      .gte("created_at", oneHourAgo)
      .limit(1)
      .maybeSingle()

    if (recentError) {
      console.error("export-org-data: failed to check for recent exports:", recentError.message)
    }
    if (recent) {
      return new Response(JSON.stringify({ error: "An export is already in progress for this organisation" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: exportRecord, error: insertError } = await db
      .from("org_data_exports")
      .insert({
        org_id: orgId,
        org_name: org.name,
        requested_by: userId,
        email_to: caller.email,
        reason: "manual",
        status: "processing",
      })
      .select("id")
      .single()

    if (insertError || !exportRecord) {
      throw new Error(`Failed to create export record: ${insertError?.message}`)
    }

    const triggerSecretKey = Deno.env.get("TRIGGER_SECRET_KEY")
    if (!triggerSecretKey) throw new Error("TRIGGER_SECRET_KEY not configured")

    const response = await fetch("https://api.trigger.dev/api/v1/tasks/export-org-data/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${triggerSecretKey}`,
      },
      body: JSON.stringify({
        payload: {
          exportId: exportRecord.id,
          orgId,
          emailTo: caller.email,
          reason: "manual",
          expiresInDays: MANUAL_EXPORT_EXPIRES_IN_DAYS,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      await db.from("org_data_exports").update({ status: "failed", error: `Trigger.dev error: ${err}` }).eq("id", exportRecord.id)
      throw new Error(`Trigger.dev error: ${err}`)
    }

    return new Response(JSON.stringify({ exportId: exportRecord.id, emailTo: caller.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("export-org-data error:", err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
