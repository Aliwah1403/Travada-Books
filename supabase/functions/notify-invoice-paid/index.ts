import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { getCallerOrgId } from "../_shared/auth.ts"
import { InvoicePaidEmail } from "../_shared/emails/invoice-paid.tsx"

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

    const { invoiceId } = await req.json()
    if (!invoiceId) return new Response(JSON.stringify({ error: "invoiceId required" }), { status: 400, headers: corsHeaders })

    const { data: invoice, error } = await db
      .from("invoices")
      .select("id, org_id, invoice_number, total, currency, customer_details, from_details")
      .eq("id", invoiceId)
      .single()

    if (error || !invoice) return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: corsHeaders })
    if (invoice.org_id !== orgId) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })

    const customer = invoice.customer_details as Record<string, string> | null
    const from = invoice.from_details as Record<string, string> | null
    const customerName = customer?.name ?? "your customer"
    const orgName = from?.name ?? "Travada Books"

    // Resolve org owner email
    const { data: member } = await db
      .from("organization_members")
      .select("users(email)")
      .eq("org_id", orgId)
      .eq("role", "owner")
      .eq("status", "active")
      .single()

    const ownerEmail = (member?.users as unknown as { email: string } | null)?.email
    if (!ownerEmail) return new Response(JSON.stringify({ error: "Owner email not found" }), { status: 422, headers: corsHeaders })

    const viewUrl = `${APP_URL}/invoices/${invoiceId}`
    const html = await render(
      React.createElement(InvoicePaidEmail, {
        invoiceNumber: invoice.invoice_number,
        customerName,
        total: invoice.total,
        currency: invoice.currency,
        viewUrl,
      })
    )

    const label = invoice.invoice_number ? `Invoice ${invoice.invoice_number}` : "Invoice"
    await resend.emails.send({
      from: `Travada Books <${FROM_EMAIL}>`,
      to: [ownerEmail],
      subject: `${label} from ${customerName} has been paid`,
      html,
    })

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (err) {
    console.error("notify-invoice-paid error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
