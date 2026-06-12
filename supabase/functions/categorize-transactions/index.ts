import OpenAI from "npm:openai@4"
import { getCallerOrgId } from "../_shared/auth.ts"
import { createCategorizePrompt, type CategorizationRow } from "../_shared/prompts/categorize.ts"

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

    // Process in batches of 50 to stay within token limits
    const BATCH_SIZE = 50
    const result: Record<string, string> = {}

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      const prompt = createCategorizePrompt(categoryNames, batch)

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      })

      const content = completion.choices[0]?.message?.content ?? "{}"
      const batchResult = JSON.parse(content) as Record<string, string>

      // Validate: only keep entries where category is in the provided list
      for (const [id, category] of Object.entries(batchResult)) {
        if (categoryNames.includes(category) || category === "Uncategorized") {
          result[id] = category
        }
      }
    }

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
