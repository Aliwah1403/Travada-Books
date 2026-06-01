import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { triggerNovu } from "../_shared/novu.ts"
import { shouldSend } from "../_shared/notification-prefs.ts"
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

    const { data: updatedRows, error: updateError } = await db
      .from("quotes")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", quote.id)
      .eq("status", "sent")
      .select("id")

    if (updateError) throw updateError
    if (!updatedRows?.length) return new Response(JSON.stringify({ error: "Quote is not available for acceptance" }), { status: 400, headers: corsHeaders })

    const { data: invoiceNumberData } = await db.rpc("next_invoice_number", {
      p_org_id: quote.org_id,
      p_customer_id: quote.customer_id,
    })

    const { data: ownerMember } = await db
      .from("organization_members")
      .select("user_id, users(email, timezone)")
      .eq("org_id", quote.org_id)
      .eq("role", "owner")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .single()
    type OwnerFields = { email: string; timezone: string | null } | null
    const ownerTz = (ownerMember?.users as unknown as OwnerFields)?.timezone ?? "UTC"

    const { data: org } = await db.from("organizations").select("email").eq("id", quote.org_id).single()
    const businessEmail = org?.email
    const issueDate = new Date().toLocaleDateString("en-CA", { timeZone: ownerTz })

    const { data: template } = await db
      .from("invoice_templates")
      .select("payment_terms, default_note, default_payment_details")
      .eq("org_id", quote.org_id)
      .eq("is_default", true)
      .maybeSingle()

    let dueDate: string | null = null
    if (template?.payment_terms) {
      const d = new Date(issueDate)
      d.setDate(d.getDate() + template.payment_terms)
      dueDate = d.toLocaleDateString("en-CA")
    }

    const note = quote.note || template?.default_note || null
    const paymentDetails = template?.default_payment_details || null

    const { data: newInvoice, error: insertError } = await db.from("invoices").insert({
      org_id: quote.org_id,
      user_id: quote.user_id,
      customer_id: quote.customer_id,
      customer_name: quote.customer_name,
      invoice_number: invoiceNumberData,
      status: "draft",
      issue_date: issueDate,
      due_date: dueDate,
      currency: quote.currency,
      line_items: quote.line_items,
      subtotal: quote.subtotal,
      tax_amount: quote.tax_amount,
      discount: quote.discount,
      total: quote.total,
      from_details: quote.from_details,
      customer_details: quote.customer_details,
      note,
      payment_details: paymentDetails,
      quote_id: quote.id,
    }).select("id").single()

    if (insertError) {
      const { error: rollbackError } = await db
        .from("quotes")
        .update({ status: "sent", accepted_at: null })
        .eq("id", quote.id)
      if (rollbackError) {
        console.error("accept-quote: rollback failed after invoice insert error:", rollbackError)
        throw new Error(
          `Invoice creation failed: ${insertError.message}. Rollback also failed: ${rollbackError.message} — quote ${quote.id} may be stuck in accepted state without an invoice.`
        )
      }
      throw insertError
    }

    const from = quote.from_details as Record<string, string> | null
    const customer = quote.customer_details as Record<string, string> | null
    const ownerEmail = (ownerMember?.users as unknown as OwnerFields)?.email

    if (from && businessEmail && ownerMember?.user_id) {
      const viewUrl = newInvoice ? `${APP_URL}/invoices/${newInvoice.id}` : `${APP_URL}/quotes/${quote.id}`
      const userId = ownerMember.user_id
      const [sendEmail, sendInApp] = await Promise.all([
        shouldSend(userId, quote.org_id, "quote.accepted", "email"),
        shouldSend(userId, quote.org_id, "quote.accepted", "in_app"),
      ])

      if (sendEmail) {
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
          to: [businessEmail],
          subject: `Quote${quote.quote_number ? ` ${quote.quote_number}` : ""} accepted by ${customer?.name ?? "customer"}`,
          html,
        })
      }

      if (sendInApp) {
        triggerNovu("quote-accepted", { subscriberId: userId, email: ownerEmail }, {
          quoteNumber: quote.quote_number,
          customerName: customer?.name ?? "A customer",
          total: quote.total,
          currency: quote.currency,
          viewUrl,
        }).catch((err) => console.error("accept-quote: novu trigger failed:", err))
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (err) {
    console.error("accept-quote error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
