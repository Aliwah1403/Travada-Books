import OpenAI from "npm:openai@4"
import { getCallerOrgId } from "../_shared/auth.ts"
import { db } from "../_shared/db.ts"
import { createExtractDocumentPrompt } from "../_shared/prompts/extract-document.ts"
import { trackAIGeneration } from "../_shared/posthog.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! })

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = await getCallerOrgId(req)
    if ("error" in auth) return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })

    const { orgId } = auth
    const body = await req.json() as {
      filePath?: string
      fileData?: string
      contentType?: string
    }

    if (!body.filePath && !body.fileData) {
      return new Response(JSON.stringify({ error: "filePath or fileData required" }), { status: 400, headers: corsHeaders })
    }

    const { data: org } = await db.from("organizations").select("name").eq("id", orgId).single()
    const orgName = org?.name ?? "the organization"

    let base64: string
    let contentType: string

    if (body.fileData) {
      base64 = body.fileData
      contentType = body.contentType ?? "image/jpeg"
    } else {
      const { data: docRow } = await db
        .from("documents")
        .select("id, file_path")
        .eq("file_path", body.filePath!)
        .eq("org_id", orgId)
        .single()

      if (!docRow) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders })
      }

      const { data: signedUrlData, error: urlError } = await db.storage
        .from("vault")
        .createSignedUrl(body.filePath!, 60)

      if (urlError || !signedUrlData?.signedUrl) {
        return new Response(JSON.stringify({ error: "Could not access file" }), { status: 404, headers: corsHeaders })
      }

      const fileResponse = await fetch(signedUrlData.signedUrl)
      if (!fileResponse.ok) {
        return new Response(JSON.stringify({ error: "Could not download file" }), { status: 422, headers: corsHeaders })
      }

      contentType = fileResponse.headers.get("content-type") ?? "image/jpeg"
      const buffer = await fileResponse.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ""
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      base64 = btoa(binary)
    }

    const prompt = createExtractDocumentPrompt(orgName)
    const t0 = Date.now()

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${contentType};base64,${base64}` } },
          ],
        },
      ],
    })

    const extracted = JSON.parse(response.choices[0].message.content ?? "{}")

    trackAIGeneration({
      distinctId: orgId,
      model: "gpt-4o",
      provider: "openai",
      functionId: "extract_document_data",
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - t0,
      input: prompt,
    })

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("extract-document-data error:", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
