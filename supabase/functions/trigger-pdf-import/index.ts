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

    const { orgId, userId } = auth
    const { filePath, defaultCurrency } = await req.json()

    if (
      typeof filePath !== "string" ||
      !filePath.startsWith(`${orgId}/imports/`) ||
      filePath.includes("..")
    ) {
      return new Response(JSON.stringify({ error: "Invalid filePath" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Fetch org name for AI context
    const { data: org } = await db
      .from("organizations")
      .select("name, currency")
      .eq("id", orgId)
      .single()

    const orgName = org?.name ?? null
    const currency = defaultCurrency || org?.currency || "KES"

    const triggerSecretKey = Deno.env.get("TRIGGER_SECRET_KEY")
    if (!triggerSecretKey) throw new Error("TRIGGER_SECRET_KEY not configured")

    const response = await fetch("https://api.trigger.dev/api/v1/tasks/import-pdf/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${triggerSecretKey}`,
      },
      body: JSON.stringify({
        payload: { filePath, orgId, userId, orgName, defaultCurrency: currency },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Trigger.dev error: ${err}`)
    }

    const run = await response.json() as { id: string }
    const publicToken = response.headers.get("x-trigger-jwt") ?? undefined

    return new Response(JSON.stringify({ runId: run.id, publicToken }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("trigger-pdf-import error:", err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
