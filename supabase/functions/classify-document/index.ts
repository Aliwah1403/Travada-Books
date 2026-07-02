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
    const { filePath } = await req.json() as { filePath?: string }

    if (!filePath || typeof filePath !== "string") {
      return new Response(JSON.stringify({ error: "filePath required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Verify the document belongs to this org and get its id + contentType
    const { data: doc, error: docError } = await db
      .from("documents")
      .select("id, content_type")
      .eq("file_path", filePath)
      .eq("org_id", orgId)
      .single()

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Reset status to pending before triggering so polling clients see the transition
    await db
      .from("documents")
      .update({ processing_status: "pending" })
      .eq("id", doc.id)
      .eq("org_id", orgId)

    const triggerSecretKey = Deno.env.get("TRIGGER_SECRET_KEY")
    if (!triggerSecretKey) throw new Error("TRIGGER_SECRET_KEY not configured")

    const response = await fetch("https://api.trigger.dev/api/v1/tasks/classify-document/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${triggerSecretKey}`,
      },
      body: JSON.stringify({
        payload: {
          documentId: doc.id,
          filePath,
          contentType: doc.content_type ?? "application/octet-stream",
          orgId,
        },
      }),
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
    console.error("classify-document error:", err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
