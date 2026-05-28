import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { QuoteAcceptedEmail } from "../_shared/emails/quote-accepted.tsx"

const APP_URL = Deno.env.get("APP_URL") ?? "https://books.travadasys.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { token } = await req.json()
    if (!token) return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: corsHeaders })

    const { data: quote, error: fetchError } = await db
      .from("quotes")
      .select("id, org_id, user_id, customer_id, customer_name, quote_number, status, currency, issue_date, line_items, subtotal, tax_amount, discount, total, from_details, customer_details, note")
      .eq("token", token)
      .single()

    if (fetchError || !quote) return new Response(JSON.stringify({ error: "Quote not found" }), { status: 404, headers: corsHeaders })
    if (quote.status !== "sent") return new Response(JSON.stringify({ error: "Quote is not available for acceptance" }), { status: 400, headers: corsHeaders })

    const { error: updateError } = await db
      .from("quotes")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", quote.id)

    if (updateError) throw updateError

    // Create draft invoice from the accepted quote
    const { data: invoiceNumberData } = await db.rpc("next_invoice_number", {
      p_org_id: quote.org_id,
      p_customer_id: quote.customer_id,
    })
    await db.from("invoices").insert({
      org_id: quote.org_id,
      user_id: quote.user_id,
      customer_id: quote.customer_id,
      customer_name: quote.customer_name,
      invoice_number: invoiceNumberData,
      status: "draft",
      issue_date: new Date().toISOString().split("T")[0],
      currency: quote.currency,
      line_items: quote.line_items,
      subtotal: quote.subtotal,
      tax_amount: quote.tax_amount,
      discount: quote.discount,
      total: quote.total,
      from_details: quote.from_details,
      customer_details: quote.customer_details,
      note: quote.note,
      quote_id: quote.id,
    })

    const from = quote.from_details as Record<string, string> | null
    const customer = quote.customer_details as Record<string, string> | null

    if (from && quote.org_id) {
      const ownerEmail = await getOrgOwnerEmail(quote.org_id)
      if (ownerEmail) {
        const viewUrl = `${APP_URL}/quotes/${quote.id}`
        const html = await render(
          React.createElement(QuoteAcceptedEmail, {
            orgName: from.name,
            quoteNumber: quote.quote_number,
            customerName: customer?.name ?? "A customer",
            total: quote.total,
            currency: quote.currency,
            viewUrl,
          })
        )
        await resend.emails.send({
          from: `Travada Books <${FROM_EMAIL}>`,
          to: [ownerEmail],
          subject: `Quote${quote.quote_number ? ` ${quote.quote_number}` : ""} accepted by ${customer?.name ?? "customer"}`,
          html,
        })
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (err) {
    console.error("accept-quote error:", err)
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
