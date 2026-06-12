import OpenAI from "npm:openai@4"
import { getCallerOrgId } from "../_shared/auth.ts"
import { createCsvMappingPrompt } from "../_shared/prompts/csv-mapping.ts"

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    })

    const content = completion.choices[0]?.message?.content ?? "{}"
    const mapping = JSON.parse(content)

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
