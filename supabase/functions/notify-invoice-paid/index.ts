import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { getCallerOrgId } from "../_shared/auth.ts"
import { triggerNovu } from "../_shared/novu.ts"
import { shouldSend } from "../_shared/notification-prefs.ts"
import { InvoicePaidEmail } from "../_shared/emails/invoice-paid.tsx"
import { formatMoney } from "../_shared/email-layout.tsx"

const APP_URL = Deno.env.get("APP_URL") ?? "https://app.travadabooks.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const WORKER_SHARED_SECRET = Deno.env.get("WORKER_SHARED_SECRET") ?? ""

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    // Awaited before responding: the runtime may stop once the response is sent.
    const novuTasks: Promise<unknown>[] = []
    // Server-to-server path (payment webhook / worker): authorised by the
    // shared secret instead of a user session, and scoped to the invoice's own
    // org. Without a valid secret we fall through to the normal user path.
    const workerSecret = req.headers.get("X-Worker-Secret") ?? ""
    const calledByWorker = WORKER_SHARED_SECRET.length > 0 && timingSafeEqual(workerSecret, WORKER_SHARED_SECRET)

    let callerOrgId: string | null = null
    if (!calledByWorker) {
      const auth = await getCallerOrgId(req)
      if ("error" in auth) return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })
      callerOrgId = auth.orgId
    }

    const { invoiceId } = await req.json()
    if (!invoiceId) return new Response(JSON.stringify({ error: "invoiceId required" }), { status: 400, headers: corsHeaders })

    const { data: invoice, error } = await db
      .from("invoices")
      .select("id, org_id, invoice_number, status, total, currency, customer_details, from_details")
      .eq("id", invoiceId)
      .single()

    if (error || !invoice) return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: corsHeaders })
    if (callerOrgId !== null && invoice.org_id !== callerOrgId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })
    }
    const orgId = invoice.org_id as string

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
      // Display string for the in-app message, e.g. "KES 100,000.00".
      totalFormatted: formatMoney(invoice.total, invoice.currency),
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
        novuTasks.push(
          triggerNovu("invoice-paid", { subscriberId: member.user_id, email }, novuPayload)
            .catch((err) => console.error("notify-invoice-paid: novu trigger failed:", err)),
        )
      }
    }

    await Promise.allSettled(novuTasks)
    return new Response(JSON.stringify({ ok: true, emailSent }), { headers: corsHeaders })
  } catch (err) {
    console.error("notify-invoice-paid error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
