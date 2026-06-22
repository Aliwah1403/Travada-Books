import OpenAI from "npm:openai@4"
import { createGoogleGenerativeAI } from "npm:@ai-sdk/google"
import { generateObject } from "npm:ai"
import { getCallerOrgId } from "../_shared/auth.ts"
import { db } from "../_shared/db.ts"
import { createExtractDocumentPrompt, extractDocumentSchema, type ExtractedDocument } from "../_shared/prompts/extract-document.ts"
import { trackAIGeneration } from "../_shared/posthog.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! })

function hasUsefulData(result: ExtractedDocument): boolean {
  return result.amount !== null || result.date !== null || result.counterparty_name !== null
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function extractWithGPT4o(
  base64: string,
  contentType: string,
  prompt: string,
): Promise<{ result: ExtractedDocument; inputTokens: number; outputTokens: number }> {
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
  return {
    result: JSON.parse(response.choices[0].message.content ?? "{}"),
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  }
}

async function extractWithGemini(
  fileData: Uint8Array,
  contentType: string,
  prompt: string,
): Promise<ExtractedDocument> {
  const google = createGoogleGenerativeAI({ apiKey: Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY")! })
  const model = google("gemini-2.5-flash")

  const content =
    contentType === "application/pdf"
      ? [
          { type: "text" as const, text: prompt },
          { type: "file" as const, data: fileData, mediaType: "application/pdf" as const },
        ]
      : [
          { type: "text" as const, text: prompt },
          { type: "image" as const, image: fileData },
        ]

  const { object } = await generateObject({
    model,
    schema: extractDocumentSchema,
    temperature: 0,
    messages: [{ role: "user", content }],
  })

  return object
}

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
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
      }
      base64 = btoa(binary)
    }

    const prompt = createExtractDocumentPrompt(orgName)
    const isPdf = contentType === "application/pdf"

    // Pass 1: GPT-4o (images only — PDFs go straight to Pass 2)
    let extracted: ExtractedDocument | null = null
    let inputTokens = 0
    let outputTokens = 0
    const t0 = Date.now()

    if (!isPdf) {
      try {
        const pass1 = await extractWithGPT4o(base64, contentType, prompt)
        extracted = pass1.result
        inputTokens = pass1.inputTokens
        outputTokens = pass1.outputTokens
      } catch (err) {
        console.warn("Pass 1 (GPT-4o) failed, falling back to Gemini", err)
      }
    }

    // Pass 2: Gemini — fallback for images, primary for PDFs
    if (!extracted || !hasUsefulData(extracted)) {
      try {
        const fileData = base64ToUint8Array(base64)
        extracted = await extractWithGemini(fileData, contentType, prompt)
      } catch (err) {
        console.error("Pass 2 (Gemini) also failed", err)
      }
    }

    if (!extracted) {
      return new Response(JSON.stringify({ error: "Could not extract data from document" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    trackAIGeneration({
      distinctId: orgId,
      model: isPdf || !hasUsefulData(extracted) ? "gemini-2.5-flash" : "gpt-4o",
      provider: isPdf ? "google" : "openai",
      functionId: "extract_document_data",
      inputTokens,
      outputTokens,
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
