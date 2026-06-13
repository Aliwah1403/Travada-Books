import OpenAI from "npm:openai@4"
import { getCallerOrgId } from "../_shared/auth.ts"
import { createCsvMappingPrompt } from "../_shared/prompts/csv-mapping.ts"
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

    const { headers, sampleRows } = await req.json()

    if (!Array.isArray(headers) || headers.length === 0) {
      return new Response(JSON.stringify({ error: "headers array required" }), { status: 400, headers: corsHeaders })
    }

    const prompt = createCsvMappingPrompt(headers, sampleRows ?? [])
    const t0 = Date.now()

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    })

    const mapping = JSON.parse(response.choices[0].message.content ?? "{}")

    trackAIGeneration({
      distinctId: auth.orgId,
      model: "gpt-4o-mini",
      provider: "openai",
      functionId: "suggest_csv_mapping",
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - t0,
      input: prompt,
    })

    return new Response(JSON.stringify(mapping), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("suggest-csv-mapping error:", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
