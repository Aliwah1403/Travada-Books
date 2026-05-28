import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { QuoteDeclinedEmail } from "../_shared/emails/quote-declined.tsx"

const APP_URL = Deno.env.get("APP_URL") ?? "https://books.travadasys.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { token, reason } = await req.json()
    if (!token) return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: corsHeaders })

    const { data: quote, error: fetchError } = await db
      .from("quotes")
      .select("id, org_id, quote_number, total, currency, from_details, customer_details, status")
      .eq("token", token)
      .single()

    if (fetchError || !quote) return new Response(JSON.stringify({ error: "Quote not found" }), { status: 404, headers: corsHeaders })
    if (quote.status === "declined") return new Response(JSON.stringify({ ok: true, alreadyDeclined: true }), { headers: corsHeaders })

    const { error: updateError } = await db
      .from("quotes")
      .update({
        status: "declined",
        declined_at: new Date().toISOString(),
        ...(reason ? { decline_reason: reason } : {}),
      })
      .eq("id", quote.id)

    if (updateError) throw updateError

    const from = quote.from_details as Record<string, string> | null
    const customer = quote.customer_details as Record<string, string> | null

    if (from && quote.org_id) {
      const ownerEmail = await getOrgOwnerEmail(quote.org_id)
      if (ownerEmail) {
        const viewUrl = `${APP_URL}/quotes/${quote.id}`
        const html = await render(
          React.createElement(QuoteDeclinedEmail, {
            orgName: from.name,
            quoteNumber: quote.quote_number,
            customerName: customer?.name ?? "A customer",
            total: quote.total,
            currency: quote.currency,
            declineReason: reason,
            viewUrl,
          })
        )
        await resend.emails.send({
          from: `Travada Books <${FROM_EMAIL}>`,
          to: [ownerEmail],
          subject: `Quote${quote.quote_number ? ` ${quote.quote_number}` : ""} declined by ${customer?.name ?? "customer"}`,
          html,
        })
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (err) {
    console.error("decline-quote error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

async function getOrgOwnerEmail(orgId: string): Promise<string | null> {
  const { data } = await db
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("role", "owner")
    .single()

  if (!data?.user_id) return null

  const { data: user } = await db
    .from("users")
    .select("email")
    .eq("id", data.user_id)
    .single()

  return user?.email ?? null
}
