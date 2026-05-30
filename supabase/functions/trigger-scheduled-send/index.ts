import { db } from "../_shared/db.ts"
import { getCallerOrgId } from "../_shared/auth.ts"

const TRIGGER_SECRET_KEY = Deno.env.get("TRIGGER_SECRET_KEY")!

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

    const { invoiceId, scheduledAt } = await req.json()
    if (!invoiceId || !scheduledAt) {
      return new Response(JSON.stringify({ error: "invoiceId and scheduledAt required" }), { status: 400, headers: corsHeaders })
    }

    const { data: invoice, error } = await db
      .from("invoices")
      .select("id, org_id, status")
      .eq("id", invoiceId)
      .single()

    if (error || !invoice) return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: corsHeaders })
    if (invoice.org_id !== orgId) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })
    if (invoice.status !== "scheduled") return new Response(JSON.stringify({ error: "Invoice must be in scheduled status" }), { status: 422, headers: corsHeaders })

    const res = await fetch("https://api.trigger.dev/api/v1/tasks/scheduled-send/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TRIGGER_SECRET_KEY}`,
      },
      body: JSON.stringify({ payload: { invoiceId, scheduledAt } }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error("Trigger.dev API error:", res.status, body)
      return new Response(JSON.stringify({ error: "Failed to enqueue scheduled send" }), { status: 500, headers: corsHeaders })
    }

    const run = await res.json()
    return new Response(JSON.stringify({ ok: true, runId: run.id }), { headers: corsHeaders })
  } catch (err) {
    console.error("trigger-scheduled-send error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
