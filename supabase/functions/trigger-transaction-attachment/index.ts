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
    const { transactionId, filePath, contentType } = await req.json() as {
      transactionId?: string
      filePath?: string
      contentType?: string
    }

    if (!transactionId || typeof transactionId !== "string") {
      return new Response(JSON.stringify({ error: "transactionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    if (!filePath || typeof filePath !== "string" || !filePath.startsWith(`${orgId}/`) || filePath.includes("..")) {
      return new Response(JSON.stringify({ error: "Invalid filePath" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Verify the transaction belongs to this org
    const { data: tx } = await db
      .from("transactions")
      .select("id")
      .eq("id", transactionId)
      .eq("org_id", orgId)
      .single()

    if (!tx) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const triggerSecretKey = Deno.env.get("TRIGGER_SECRET_KEY")
    if (!triggerSecretKey) throw new Error("TRIGGER_SECRET_KEY not configured")

    const response = await fetch(
      "https://api.trigger.dev/api/v1/tasks/process-transaction-attachment/trigger",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${triggerSecretKey}`,
        },
        body: JSON.stringify({
          payload: {
            transactionId,
            orgId,
            filePath,
            contentType: contentType ?? "application/octet-stream",
          },
        }),
      },
    )

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Trigger.dev error: ${err}`)
    }

    const run = await response.json() as { id: string }

    return new Response(JSON.stringify({ runId: run.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("trigger-transaction-attachment error:", err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
