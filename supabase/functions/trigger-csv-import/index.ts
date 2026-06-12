import { getCallerOrgId } from "../_shared/auth.ts"

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
    const { filePath, mapping, defaultCurrency, rowCount } = await req.json()

    const expectedPrefix = `${orgId}/imports/`
    if (
      typeof filePath !== "string" ||
      !filePath.startsWith(expectedPrefix) ||
      filePath.includes("..")
    ) {
      return new Response(JSON.stringify({ error: "Invalid filePath" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!mapping) {
      return new Response(JSON.stringify({ error: "mapping required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const triggerSecretKey = Deno.env.get("TRIGGER_SECRET_KEY")
    if (!triggerSecretKey) throw new Error("TRIGGER_SECRET_KEY not configured")

    const response = await fetch("https://api.trigger.dev/api/v1/tasks/import-csv/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${triggerSecretKey}`,
      },
      body: JSON.stringify({
        payload: { filePath, mapping, orgId, userId, defaultCurrency, rowCount: rowCount ?? 0 },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Trigger.dev error: ${err}`)
    }

    const run = await response.json() as { id: string }
    // x-trigger-jwt is a short-lived read:runs:{id} scoped token — safe to expose to the client
    const publicToken = response.headers.get("x-trigger-jwt") ?? undefined

    return new Response(JSON.stringify({ runId: run.id, publicToken }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("trigger-csv-import error:", err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
