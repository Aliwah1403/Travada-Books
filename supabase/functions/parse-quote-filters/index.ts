import OpenAI from "npm:openai@4"
import { getCallerOrgId } from "../_shared/auth.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! })

const SYSTEM_PROMPT = `You are a filter parser for a quotes/proposals app.
Convert the user's natural language query into structured filter parameters.

Return a JSON object with these optional fields (omit or null any not applicable):
- name: string | null — customer or company name to search for
- statuses: string[] | null — array of: "draft", "sent", "accepted", "declined", "expired"
- dateFrom: string | null — start date in YYYY-MM-DD format
- dateTo: string | null — end date in YYYY-MM-DD format

Rules:
- Only set fields explicitly mentioned or clearly implied
- For relative dates ("last month", "this week", "this year") compute absolute YYYY-MM-DD dates
- "accepted", "approved", "won" → statuses: ["accepted"]
- "declined", "rejected", "lost" → statuses: ["declined"]
- "sent", "pending" → statuses: ["sent"]
- "expired", "lapsed" → statuses: ["expired"]
- "draft" → statuses: ["draft"]
- Multiple statuses are allowed
- Return null for fields not mentioned`

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = await getCallerOrgId(req)
    if ("error" in auth) {
      return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })
    }

    const { input, currentDate, timezone } = await req.json() as {
      input: string
      currentDate?: string
      timezone?: string
    }

    if (!input?.trim()) {
      return new Response(JSON.stringify({ error: "input required" }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const contextLines = [
      currentDate ? `Current date: ${currentDate}` : null,
      timezone ? `Timezone: ${timezone}` : null,
    ].filter(Boolean)

    const systemPrompt = contextLines.length
      ? `${SYSTEM_PROMPT}\n\n${contextLines.join("\n")}`
      : SYSTEM_PROMPT

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input },
      ],
    })

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}")

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("parse-quote-filters error:", err)
    return new Response(JSON.stringify({ error: "Failed to parse filters" }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
