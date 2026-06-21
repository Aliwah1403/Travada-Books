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
    const body = await req.json() as { transactionIds?: string[]; format?: string; emailTo?: string }

    const { transactionIds, format, emailTo } = body

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return new Response(JSON.stringify({ error: "transactionIds must be a non-empty array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (transactionIds.length > 5000) {
      return new Response(JSON.stringify({ error: "Cannot export more than 5000 transactions at once" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!format || !["csv", "xlsx"].includes(format)) {
      return new Response(JSON.stringify({ error: "format must be csv or xlsx" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (emailTo && typeof emailTo !== "string") {
      return new Response(JSON.stringify({ error: "emailTo must be a string" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: exportRecord, error: insertError } = await db
      .from("transaction_exports")
      .insert({ org_id: orgId, created_by: userId, format, status: "processing" })
      .select("id")
      .single()

    if (insertError || !exportRecord) {
      throw new Error(`Failed to create export record: ${insertError?.message}`)
    }

    const triggerSecretKey = Deno.env.get("TRIGGER_SECRET_KEY")
    if (!triggerSecretKey) throw new Error("TRIGGER_SECRET_KEY not configured")

    const response = await fetch("https://api.trigger.dev/api/v1/tasks/export-transactions/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${triggerSecretKey}`,
      },
      body: JSON.stringify({
        payload: {
          exportId: exportRecord.id,
          orgId,
          transactionIds,
          format,
          ...(emailTo ? { emailTo } : {}),
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      await db.from("transaction_exports").update({ status: "failed", error: `Trigger.dev error: ${err}` }).eq("id", exportRecord.id)
      throw new Error(`Trigger.dev error: ${err}`)
    }

    return new Response(JSON.stringify({ exportId: exportRecord.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("export-transactions error:", err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
