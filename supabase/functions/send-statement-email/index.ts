import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { getCallerOrgId } from "../_shared/auth.ts"
import { StatementSentEmail } from "../_shared/emails/statement-sent.tsx"

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

    const { statementId } = await req.json()
    if (!statementId) return new Response(JSON.stringify({ error: "statementId required" }), { status: 400, headers: corsHeaders })

    const { data: statement, error } = await db
      .from("statements")
      .select("id, org_id, token, date_from, date_to, snapshot_data, from_details, customer_details")
      .eq("id", statementId)
      .single()

    if (error || !statement) return new Response(JSON.stringify({ error: "Statement not found" }), { status: 404, headers: corsHeaders })
    if (statement.org_id !== orgId) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })

    const from = statement.from_details as Record<string, string> | null
    const customer = statement.customer_details as Record<string, string> | null

    if (!from || !customer) {
      return new Response(JSON.stringify({ error: "Statement has no snapshot data" }), { status: 422, headers: corsHeaders })
    }

    const recipientEmail = (customer.billing_email || customer.email) as string
    if (!recipientEmail) return new Response(JSON.stringify({ error: "Customer has no email" }), { status: 422, headers: corsHeaders })

    const invoices = (Array.isArray(statement.snapshot_data) ? statement.snapshot_data : []) as Array<{ total?: number; status?: string; currency?: string }>
    const totalDebits = invoices.reduce((s, inv) => s + (inv.total ?? 0), 0)
    const totalCredits = invoices.filter((inv) => inv.status === "paid").reduce((s, inv) => s + (inv.total ?? 0), 0)
    const totalOwing = totalDebits - totalCredits
    const currency = invoices[0]?.currency ?? "USD"

    const publicUrl = `${APP_URL}/s/${statement.token}`
    const html = await render(
      React.createElement(StatementSentEmail, {
        orgName: from.name,
        orgLogoUrl: from.logo_url,
        orgEmail: from.email,
        customerName: customer.name,
        dateFrom: statement.date_from,
        dateTo: statement.date_to,
        totalOwing,
        currency,
        publicUrl,
      })
    )

    const subject = `Account Statement from ${from.name}`
    await resend.emails.send({
      from: `${from.name} <${FROM_EMAIL}>`,
      to: [recipientEmail],
      replyTo: from.email,
      subject,
      html,
    })

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (err) {
    console.error("send-statement-email error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
