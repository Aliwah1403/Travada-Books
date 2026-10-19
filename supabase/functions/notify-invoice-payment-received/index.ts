import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { triggerNovu } from "../_shared/novu.ts"
import { shouldSend } from "../_shared/notification-prefs.ts"
import { InvoicePaymentReceivedEmail } from "../_shared/emails/invoice-payment-received.tsx"
import { formatMoney } from "../_shared/email-layout.tsx"

// Tells the business a customer part-paid an invoice online (Paystack). Called
// only server-to-server by _shared/record-gateway-payment.ts, gated by
// X-Worker-Secret. A payment that settles the invoice goes through
// notify-invoice-paid instead, so the two never fire for the same payment.
// Same audience and prefs pattern as notify-invoice-paid (active owners,
// notification type "invoice.payment_received").

const APP_URL = Deno.env.get("APP_URL") ?? "https://app.travadabooks.com"
const WORKER_SHARED_SECRET = Deno.env.get("WORKER_SHARED_SECRET") ?? ""

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const workerSecret = req.headers.get("X-Worker-Secret") ?? ""
    if (!(WORKER_SHARED_SECRET.length > 0 && timingSafeEqual(workerSecret, WORKER_SHARED_SECRET))) {
      return json({ error: "Forbidden" }, 403)
    }

    const { reference } = await req.json()
    if (typeof reference !== "string" || !reference) return json({ error: "reference required" }, 400)

    // Everything comes from our own rows, keyed by the payment reference.
    const { data: payment, error: paymentError } = await db
      .from("invoice_payments")
      .select("invoice_id, amount")
      .eq("gateway_reference", reference)
      .maybeSingle()
    if (paymentError) throw paymentError
    if (!payment) return json({ error: "Payment not found" }, 404)

    const { data: invoice, error: invoiceError } = await db
      .from("invoices")
      .select("id, org_id, invoice_number, status, total, amount_paid, currency, customer_details, customer_name")
      .eq("id", payment.invoice_id)
      .single()
    if (invoiceError || !invoice) return json({ error: "Invoice not found" }, 404)

    // Settled by now (another payment landed): notify-invoice-paid covers it.
    if (invoice.status !== "partially_paid") return json({ ok: true, skipped: true })

    const orgId = invoice.org_id as string
    const customer = invoice.customer_details as Record<string, string> | null
    const customerName = customer?.name ?? invoice.customer_name ?? "Your customer"
    const amount = Number(payment.amount)
    const balanceDue = Math.max(Math.round((Number(invoice.total ?? 0) - Number(invoice.amount_paid ?? 0)) * 100) / 100, 0)
    const viewUrl = `${APP_URL}/invoices/${invoice.id}`
    const label = invoice.invoice_number ? `Invoice ${invoice.invoice_number}` : "Invoice"

    const { data: members, error: membersError } = await db
      .from("organization_members")
      .select("user_id, users(email)")
      .eq("org_id", orgId)
      .eq("role", "owner")
      .eq("status", "active")
    if (membersError) throw membersError
    if (!members || members.length === 0) return json({ ok: true, skipped: true })

    const { data: org } = await db.from("organizations").select("email").eq("id", orgId).single()
    const businessEmail = org?.email

    type UserEmail = { email: string } | null
    let emailSent = false

    for (const member of members) {
      const email = (member.users as unknown as UserEmail)?.email
      if (!email) continue
      const [sendEmail, sendInApp] = await Promise.all([
        shouldSend(member.user_id, orgId, "invoice.payment_received", "email"),
        shouldSend(member.user_id, orgId, "invoice.payment_received", "in_app"),
      ])

      // One email per org (the business inbox), once per payment.
      if (sendEmail && businessEmail && !emailSent) {
        const html = await render(
          React.createElement(InvoicePaymentReceivedEmail, {
            invoiceNumber: invoice.invoice_number,
            customerName,
            amount,
            balanceDue,
            currency: invoice.currency,
            viewUrl,
          }),
        )
        const { error: sendError } = await resend.emails.send(
          {
            from: `Travada Books <${FROM_EMAIL}>`,
            to: [businessEmail],
            subject: `${customerName} paid part of ${label}`,
            html,
          },
          { idempotencyKey: `payment-received-${reference}` },
        )
        if (sendError) console.warn(`notify-invoice-payment-received: email failed for ${reference}:`, sendError.message)
        emailSent = true
      }

      if (sendInApp) {
        triggerNovu(
          "invoice-payment-received",
          { subscriberId: member.user_id, email },
          {
            invoiceNumber: invoice.invoice_number,
            customerName,
            amount,
            balanceDue,
            currency: invoice.currency,
            // Display strings for the in-app message, e.g. "KES 100,000.00".
            amountFormatted: formatMoney(amount, invoice.currency),
            balanceDueFormatted: formatMoney(balanceDue, invoice.currency),
            viewUrl,
          },
        ).catch((err) => console.error("notify-invoice-payment-received: novu trigger failed:", err))
      }
    }

    return json({ ok: true, emailSent })
  } catch (err) {
    console.error("notify-invoice-payment-received error:", err)
    return json({ error: "Internal error" }, 500)
  }
})
