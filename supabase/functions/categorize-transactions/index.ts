import OpenAI from "npm:openai@4"
import { getCallerOrgId } from "../_shared/auth.ts"
import { createCategorizePrompt, type CategorizationRow } from "../_shared/prompts/categorize.ts"
import { trackAIGeneration } from "../_shared/posthog.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! })

const BATCH_SIZE = 50

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = await getCallerOrgId(req)
    if ("error" in auth) return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })

    const { rows, categoryNames } = await req.json() as {
      rows: CategorizationRow[]
      categoryNames: string[]
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "rows array required" }), { status: 400, headers: corsHeaders })
    }
    if (!Array.isArray(categoryNames) || categoryNames.length === 0) {
      return new Response(JSON.stringify({ error: "categoryNames array required" }), { status: 400, headers: corsHeaders })
    }

    const result: Record<string, string> = {}
    let totalInputTokens = 0
    let totalOutputTokens = 0
    const t0 = Date.now()

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      const prompt = createCategorizePrompt(categoryNames, batch)

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      })

      totalInputTokens += response.usage?.prompt_tokens ?? 0
      totalOutputTokens += response.usage?.completion_tokens ?? 0

      const batchResult = JSON.parse(response.choices[0].message.content ?? "{}") as Record<string, string>

      for (const [id, category] of Object.entries(batchResult)) {
        if (categoryNames.includes(category) || category === "Uncategorized") {
          result[id] = category
        }
      }
    }

    trackAIGeneration({
      distinctId: auth.orgId,
      model: "gpt-4o-mini",
      provider: "openai",
      functionId: "categorize_transactions",
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      latencyMs: Date.now() - t0,
    })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("categorize-transactions error:", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
