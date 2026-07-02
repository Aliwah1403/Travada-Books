import { createClient } from "npm:@supabase/supabase-js@2"
import { getCallerOrgId } from "../_shared/auth.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type TransactionRow = {
  id: string
  date: string
  name: string
  counterparty_name?: string | null
  amount: number
  currency: string
  type: "income" | "expense"
  reference_number?: string | null
  note?: string | null
}

const BATCH_SIZE = 500

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = await getCallerOrgId(req)
    if ("error" in auth) return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })

    const { orgId, userId } = auth
    const { rows } = await req.json() as { rows: TransactionRow[] }

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "rows array required" }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    let inserted = 0

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map((row) => ({
        id: row.id,
        org_id: orgId,
        created_by: userId,
        date: row.date,
        name: row.name,
        counterparty_name: row.counterparty_name ?? null,
        amount: row.amount,
        currency: row.currency,
        type: row.type,
        status: "completed",
        reference_number: row.reference_number ?? null,
        note: row.note ?? null,
        recurring: false,
        internal: false,
        manual: true,
      }))

      const { error } = await supabase.from("transactions").insert(batch)
      if (error) throw error
      inserted += batch.length
    }

    return new Response(JSON.stringify({ imported: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("import-transactions error:", err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
