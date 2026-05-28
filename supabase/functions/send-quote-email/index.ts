import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { getCallerOrgId } from "../_shared/auth.ts"
import { QuoteSentEmail } from "../_shared/emails/quote-sent.tsx"

const APP_URL = Deno.env.get("APP_URL") ?? "https://books.travadasys.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = await getCallerOrgId(req)
    if ("error" in auth) return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })
    const { orgId } = auth

    const { quoteId } = await req.json()
    if (!quoteId) return new Response(JSON.stringify({ error: "quoteId required" }), { status: 400, headers: corsHeaders })

    const { data: quote, error } = await db
      .from("quotes")
      .select("id, org_id, quote_number, issue_date, valid_until, total, currency, line_items, note, token, from_details, customer_details")
      .eq("id", quoteId)
      .single()

    if (error || !quote) return new Response(JSON.stringify({ error: "Quote not found" }), { status: 404, headers: corsHeaders })
    if (quote.org_id !== orgId) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })

    const from = quote.from_details as Record<string, string> | null
    const customer = quote.customer_details as Record<string, string> | null

    if (!from || !customer) {
      return new Response(JSON.stringify({ error: "Quote must be sent before emailing" }), { status: 422, headers: corsHeaders })
    }

    const recipientEmail = (customer.billing_email || customer.email) as string
    if (!recipientEmail) return new Response(JSON.stringify({ error: "Customer has no email" }), { status: 422, headers: corsHeaders })

    const publicUrl = quote.token ? `${APP_URL}/q/${quote.token}` : APP_URL
    const html = await render(
      React.createElement(QuoteSentEmail, {
        orgName: from.name,
        orgLogoUrl: from.logo_url,
        orgEmail: from.email,
        customerName: customer.name,
        quoteNumber: quote.quote_number,
        issueDate: quote.issue_date,
        validUntil: quote.valid_until,
        total: quote.total,
        currency: quote.currency,
        lineItems: (quote.line_items as []) ?? [],
        publicUrl,
        note: quote.note,
      })
    )

    const subject = `Quote${quote.quote_number ? ` ${quote.quote_number}` : ""} from ${from.name}`
    await resend.emails.send({
      from: `${from.name} <${FROM_EMAIL}>`,
      to: [recipientEmail],
      replyTo: from.email,
      subject,
      html,
    })

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (err) {
    console.error("send-quote-email error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
