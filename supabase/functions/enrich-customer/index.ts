import { getCallerOrgId } from "../_shared/auth.ts"
import { db } from "../_shared/db.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = await getCallerOrgId(req)
    if ("error" in auth) return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })

    const { orgId } = auth
    const { customerId } = await req.json()

    if (!customerId || typeof customerId !== "string") {
      return new Response(JSON.stringify({ error: "customerId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Verify customer belongs to this org
    const { data: customer, error: customerError } = await db
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("org_id", orgId)
      .single()

    if (customerError || !customer) {
      return new Response(JSON.stringify({ error: "Customer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Mark as pending before triggering so the UI updates immediately
    await db
      .from("customers")
      .update({ enrichment_status: "pending" })
      .eq("id", customerId)

    const triggerSecretKey = Deno.env.get("TRIGGER_SECRET_KEY")
    if (!triggerSecretKey) throw new Error("TRIGGER_SECRET_KEY not configured")

    const response = await fetch("https://api.trigger.dev/api/v1/tasks/enrich-customer/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${triggerSecretKey}`,
      },
      body: JSON.stringify({ payload: { customerId, orgId } }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Trigger.dev error: ${err}`)
    }

    const run = await response.json() as { id: string }

    return new Response(JSON.stringify({ runId: run.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("enrich-customer error:", err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
