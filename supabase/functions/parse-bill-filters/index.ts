import OpenAI from "npm:openai@4"
import { getCallerOrgId } from "../_shared/auth.ts"
import { rateLimitResponse } from "../_shared/rate-limit.ts"

// Bills page "search or filter" box: turns a sentence ("unpaid KPLC bills due
// this month over 5k") into the Bills page's filters. Same shape as
// parse-invoice-filters; the app maps the result onto its filter chips.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! })

const SYSTEM_PROMPT = `You are a filter parser for the Bills page of a bookkeeping app. Bills are invoices the business received from suppliers and has to pay.
Convert the user's natural language query into structured filter parameters.

Return a JSON object with these optional fields (omit or null any not applicable):
- name: string | null — supplier name, bill number or other text to search for
- status: "unpaid" | "paid" | null
- overdue: boolean | null — true for overdue bills only
- dueFrom: string | null — due date start, YYYY-MM-DD
- dueTo: string | null — due date end, YYYY-MM-DD
- issuedFrom: string | null — bill (issue) date start, YYYY-MM-DD
- issuedTo: string | null — bill (issue) date end, YYYY-MM-DD
- paidFrom: string | null — paid date start, YYYY-MM-DD
- paidTo: string | null — paid date end, YYYY-MM-DD
- amountMin: number | null — for "over X", "more than X", "at least X", "above X"
- amountMax: number | null — for "under X", "less than X", "at most X", "below X"
- currencies: string[] | null — ISO 4217 codes, e.g. ["USD"]
- source: "inbox" | "manual" | null
- matched: boolean | null — true if matched/reconciled to a transaction, false if not yet matched

Rules:
- Only set fields explicitly mentioned or clearly implied
- For relative dates ("this month", "next week", "last quarter") compute absolute YYYY-MM-DD dates
- For "this/last/next week" and "this/last/next month", use the exact periods given below; don't compute your own
- Dates mean the due date ("due", "coming up", "this week") unless the user says issued/dated/received (issue date) or paid (paid date)
- "unpaid", "outstanding", "open", "to pay" → status: "unpaid"
- "paid", "settled" → status: "paid"; "paid last month" → status: "paid" plus paidFrom/paidTo
- "overdue", "late", "past due" → overdue: true (and status: "unpaid")
- "dollars", "$", "USD" → currencies: ["USD"]; "shillings", "KSh", "KES" → currencies: ["KES"]
- "from the inbox", "emailed", "forwarded" → source: "inbox"; "added manually", "entered by hand" → source: "manual"
- "matched", "reconciled", "linked" → matched: true; "unmatched", "not reconciled", "no transaction" → matched: false
- For supplier names, prefer a name from the known suppliers list when one fits; put it in name
- Amounts: "5k" = 5000, "1M" = 1000000; set both amountMin and amountMax for "between X and Y"
- Return null for fields not mentioned`

// Calendar periods worked out here, not by the model (it's unreliable at
// date arithmetic). Weeks run Monday–Sunday.
function periods(today: string): string[] {
  const [y, m, d] = today.split("-").map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  const iso = (dt: Date) => dt.toISOString().slice(0, 10)
  const addDays = (dt: Date, n: number) => new Date(dt.getTime() + n * 86_400_000)
  const monday = addDays(base, -((base.getUTCDay() + 6) % 7))
  const monthStart = (offset: number) => new Date(Date.UTC(y, m - 1 + offset, 1))
  const monthEnd = (offset: number) => addDays(monthStart(offset + 1), -1)
  return [
    `This week: ${iso(monday)} to ${iso(addDays(monday, 6))}`,
    `Last week: ${iso(addDays(monday, -7))} to ${iso(addDays(monday, -1))}`,
    `Next week: ${iso(addDays(monday, 7))} to ${iso(addDays(monday, 13))}`,
    `This month: ${iso(monthStart(0))} to ${iso(monthEnd(0))}`,
    `Last month: ${iso(monthStart(-1))} to ${iso(monthEnd(-1))}`,
    `Next month: ${iso(monthStart(1))} to ${iso(monthEnd(1))}`,
  ]
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = await getCallerOrgId(req)
    if ("error" in auth) {
      return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })
    }
    const limited = await rateLimitResponse("ai", auth.userId, corsHeaders)
    if (limited) return limited

    const { input, currentDate, timezone, vendors } = (await req.json()) as {
      input: string
      currentDate?: string
      timezone?: string
      vendors?: string[]
    }

    if (!input?.trim()) {
      return new Response(JSON.stringify({ error: "input required" }), { status: 400, headers: corsHeaders })
    }

    const contextLines = [
      currentDate ? `Current date: ${currentDate}` : null,
      ...(currentDate && /^\d{4}-\d{2}-\d{2}$/.test(currentDate) ? periods(currentDate) : []),
      timezone ? `Timezone: ${timezone}` : null,
      vendors?.length ? `Known suppliers: ${vendors.slice(0, 200).join(", ")}` : null,
    ].filter(Boolean)

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: contextLines.length ? `${SYSTEM_PROMPT}\n\n${contextLines.join("\n")}` : SYSTEM_PROMPT },
        { role: "user", content: input },
      ],
    })

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}")
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (err) {
    console.error("parse-bill-filters error:", err)
    return new Response(JSON.stringify({ error: "Failed to parse filters" }), { status: 500, headers: corsHeaders })
  }
})
