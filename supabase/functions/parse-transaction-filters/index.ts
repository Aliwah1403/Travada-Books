import OpenAI from "npm:openai@4"
import { getCallerOrgId } from "../_shared/auth.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! })

const SYSTEM_PROMPT = `You are a filter parser for a financial transactions app.
Convert the user's natural language query into structured filter parameters.

Return a JSON object with these optional fields (omit or null any not applicable):
- name: string | null — merchant or transaction name to search for
- dateFrom: string | null — start date in YYYY-MM-DD format
- dateTo: string | null — end date in YYYY-MM-DD format
- type: "income" | "expense" | null
- status: "pending" | "completed" | "excluded" | "archived" | null
- categoryName: string | null — must exactly match one of the available categories provided
- paymentMode: "mpesa" | "bank_transfer" | "cash" | "cheque" | "card" | "other" | null
- recurring: true | false | null
- amountMin: number | null — minimum amount (for "over X", "more than X", "at least X", "above X")
- amountMax: number | null — maximum amount (for "under X", "less than X", "at most X", "below X")

Rules:
- Only set fields explicitly mentioned or clearly implied
- For relative dates ("last month", "this week", "this year") compute absolute YYYY-MM-DD dates
- "income", "revenue", "earnings", "sales" → type: "income"; "expense", "cost", "payment", "bill", "fee" → type: "expense"
- Only set categoryName if it closely matches an available category; otherwise null
- "M-Pesa", "mpesa", "mobile money" → paymentMode: "mpesa"
- "bank", "wire", "transfer" → paymentMode: "bank_transfer"
- For amounts: "100k" = 100000, "1M" = 1000000, "1m" = 1000000; set both amountMin and amountMax for "between X and Y"
- Return null for fields not mentioned`

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = await getCallerOrgId(req)
    if ("error" in auth) {
      return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })
    }

    const { input, categories, currentDate, timezone } = await req.json() as {
      input: string
      categories?: string[]
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
      categories?.length ? `Available categories: ${categories.join(", ")}` : null,
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

    const content = completion.choices[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(content)

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("parse-transaction-filters error:", err)
    return new Response(JSON.stringify({ error: "Failed to parse filters" }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
