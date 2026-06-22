import { getCallerOrgId } from "../_shared/auth.ts"
import { db } from "../_shared/db.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" }

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30

function nanoid(len = 10): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(bytes, (b) => chars[b % chars.length]).join("")
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = await getCallerOrgId(req)
    if ("error" in auth) return auth.error

    const { orgId } = auth
    const { documentId } = await req.json() as { documentId?: string }

    if (!documentId || typeof documentId !== "string") {
      return new Response(JSON.stringify({ error: "documentId required" }), {
        status: 400,
        headers: JSON_HEADERS,
      })
    }

    // Verify document belongs to this org
    const { data: doc, error: docError } = await db
      .from("documents")
      .select("id, name, file_path, file_size, content_type, org_id")
      .eq("id", documentId)
      .eq("org_id", orgId)
      .single()

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: JSON_HEADERS,
      })
    }

    // Generate a 30-day signed URL for the file
    const { data: signedData, error: urlError } = await db.storage
      .from("vault")
      .createSignedUrl(doc.file_path, THIRTY_DAYS_SECONDS, { download: true })

    if (urlError || !signedData?.signedUrl) {
      throw new Error(`Failed to create signed URL: ${urlError?.message}`)
    }

    const token = nanoid(10)
    const expiresAt = new Date(Date.now() + THIRTY_DAYS_SECONDS * 1000).toISOString()

    const { error: insertError } = await db
      .from("document_shares")
      .insert({
        document_id: doc.id,
        org_id: doc.org_id,
        token,
        signed_url: signedData.signedUrl,
        file_name: doc.name,
        file_size: doc.file_size,
        content_type: doc.content_type,
        expires_at: expiresAt,
      })

    if (insertError) throw new Error(`Failed to create share: ${insertError.message}`)

    return new Response(JSON.stringify({ token }), {
      headers: JSON_HEADERS,
    })
  } catch (err) {
    console.error("create-document-share error:", err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: JSON_HEADERS },
    )
  }
})
