import OpenAI from "npm:openai@4"
import { getCallerOrgId } from "../_shared/auth.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! })

const SYSTEM_PROMPT = `You are a filter parser for an invoicing app.
Convert the user's natural language query into structured filter parameters.

Return a JSON object with these optional fields (omit or null any not applicable):
- name: string | null — customer or company name to search for
- statuses: string[] | null — array of: "draft", "unpaid", "paid", "overdue", "canceled", "scheduled"
- dateFrom: string | null — issue date start in YYYY-MM-DD format
- dateTo: string | null — issue date end in YYYY-MM-DD format
- customers: string[] | null — array of customer names from the available customers list
- recurring: boolean | null — true for recurring invoices only, false for one-time invoices only
- amountMin: number | null — minimum invoice total (for "over X", "more than X", "at least X", "above X")
- amountMax: number | null — maximum invoice total (for "under X", "less than X", "at most X", "below X")

Rules:
- Only set fields explicitly mentioned or clearly implied
- For relative dates ("last month", "this week", "this year") compute absolute YYYY-MM-DD dates
- "unpaid", "outstanding", "open" → statuses: ["unpaid"]
- "paid", "settled" → statuses: ["paid"]
- "overdue", "late", "past due" → statuses: ["overdue"]
- "draft" → statuses: ["draft"]
- "canceled", "cancelled" → statuses: ["canceled"]
- "scheduled" → statuses: ["scheduled"]
- Multiple statuses are allowed
- "recurring", "subscription", "repeat" → recurring: true
- "one-time", "one time", "non-recurring", "single" → recurring: false
- For customers, only match names that appear in the available customers list
- For amounts: "100k" = 100000, "1M" = 1000000, "1m" = 1000000; set both amountMin and amountMax for "between X and Y"
- Return null for fields not mentioned`

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = await getCallerOrgId(req)
    if ("error" in auth) {
      return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })
    }

    const { input, currentDate, timezone, customers } = await req.json() as {
      input: string
      currentDate?: string
      timezone?: string
      customers?: string[]
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
      customers?.length ? `Available customers: ${customers.join(", ")}` : null,
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
    console.error("parse-invoice-filters error:", err)
    return new Response(JSON.stringify({ error: "Failed to parse filters" }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
