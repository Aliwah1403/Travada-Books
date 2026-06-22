import { db } from "../_shared/db.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get("token")

    if (!token) {
      return new Response(JSON.stringify({ error: "token required" }), {
        status: 400,
        headers: JSON_HEADERS,
      })
    }

    const { data: share, error } = await db
      .from("document_shares")
      .select("token, signed_url, file_name, file_size, content_type, expires_at, org_id")
      .eq("token", token)
      .single()

    if (error || !share) {
      return new Response(JSON.stringify({ error: "Share not found" }), {
        status: 404,
        headers: JSON_HEADERS,
      })
    }

    if (new Date(share.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This link has expired" }), {
        status: 410,
        headers: JSON_HEADERS,
      })
    }

    // Fetch org name for the download page
    const { data: org } = await db
      .from("organizations")
      .select("name")
      .eq("id", share.org_id)
      .single()

    return new Response(
      JSON.stringify({
        signedUrl: share.signed_url,
        fileName: share.file_name,
        fileSize: share.file_size,
        contentType: share.content_type,
        expiresAt: share.expires_at,
        orgName: org?.name ?? null,
      }),
      { headers: JSON_HEADERS },
    )
  } catch (err) {
    console.error("get-document-share error:", err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: JSON_HEADERS },
    )
  }
})
