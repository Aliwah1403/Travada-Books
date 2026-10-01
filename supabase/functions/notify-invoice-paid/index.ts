import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { getCallerOrgId } from "../_shared/auth.ts"
import { triggerNovu } from "../_shared/novu.ts"
import { shouldSend } from "../_shared/notification-prefs.ts"
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
      .select("id, org_id, invoice_number, status, total, currency, customer_details, from_details")
      .eq("id", invoiceId)
      .single()

    if (error || !invoice) return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: corsHeaders })
    if (invoice.org_id !== orgId) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })

    // Defensive: only notify for invoices that are actually paid. Guards
    // against a stale/duplicate call reaching this after the invoice moved
    // on (e.g. a payment was later reversed).
    if (invoice.status !== "paid") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: corsHeaders })
    }

    const customer = invoice.customer_details as Record<string, string> | null
    const customerName = customer?.name ?? "your customer"

    const { data: members, error: membersError } = await db
      .from("organization_members")
      .select("user_id, users(email)")
      .eq("org_id", orgId)
      .eq("role", "owner")
      .eq("status", "active")

    if (membersError) {
      console.error(`notify-invoice-paid: owner lookup failed for org ${orgId}:`, membersError)
      return new Response(JSON.stringify({ error: "Owner lookup failed" }), { status: 500, headers: corsHeaders })
    }
    if (!members || members.length === 0) {
      console.warn(`notify-invoice-paid: no active owner found for org ${orgId}, skipping invoice ${invoiceId}`)
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: corsHeaders })
    }

    const { data: org } = await db.from("organizations").select("email").eq("id", orgId).single()
    const businessEmail = org?.email

    type UserEmail = { email: string } | null

    const viewUrl = `${APP_URL}/invoices/${invoiceId}`
    const label = invoice.invoice_number ? `Invoice ${invoice.invoice_number}` : "Invoice"
    const novuPayload = {
      invoiceNumber: invoice.invoice_number,
      customerName,
      total: invoice.total,
      currency: invoice.currency,
      viewUrl,
    }

    // Send the Resend email at most once for the whole org, even though we
    // iterate per-owner below to gate Novu — the org business email is a
    // single shared inbox, not one per owner.
    let emailSent = false

    for (const member of members) {
      const email = (member.users as unknown as UserEmail)?.email
      if (!email) continue
      const [sendEmail, sendInApp] = await Promise.all([
        shouldSend(member.user_id, orgId, "invoice.paid", "email"),
        shouldSend(member.user_id, orgId, "invoice.paid", "in_app"),
      ])

      if (sendEmail && businessEmail && !emailSent) {
        const html = await render(
          React.createElement(InvoicePaidEmail, {
            invoiceNumber: invoice.invoice_number,
            customerName,
            total: invoice.total,
            currency: invoice.currency,
            viewUrl,
          })
        )
        await resend.emails.send({
          from: `Travada Books <${FROM_EMAIL}>`,
          to: [businessEmail],
          subject: `${label} from ${customerName} has been paid`,
          html,
        })
        emailSent = true
      }

      if (sendInApp) {
        triggerNovu("invoice-paid", { subscriberId: member.user_id, email }, novuPayload)
          .catch((err) => console.error("notify-invoice-paid: novu trigger failed:", err))
      }
    }

    return new Response(JSON.stringify({ ok: true, emailSent }), { headers: corsHeaders })
  } catch (err) {
    console.error("notify-invoice-paid error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
