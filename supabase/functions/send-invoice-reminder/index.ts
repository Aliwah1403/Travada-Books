import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { getCallerOrgId } from "../_shared/auth.ts"
import { InvoiceReminderEmail } from "../_shared/emails/invoice-reminder.tsx"

const APP_URL = Deno.env.get("APP_URL") ?? "https://books.travadasys.com"
const WORKER_SHARED_SECRET = Deno.env.get("WORKER_SHARED_SECRET") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const workerSecret = req.headers.get("X-Worker-Secret") ?? ""
    const authBearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "")
    const calledByWorker =
      (WORKER_SHARED_SECRET.length > 0 && timingSafeEqual(workerSecret, WORKER_SHARED_SECRET)) ||
      (SUPABASE_SERVICE_ROLE_KEY.length > 0 && timingSafeEqual(authBearer, SUPABASE_SERVICE_ROLE_KEY))

    let orgId: string | null = null
    if (!calledByWorker) {
      const auth = await getCallerOrgId(req)
      if ("error" in auth) return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })
      orgId = auth.orgId
    }

    const { invoiceId } = await req.json()
    if (!invoiceId) return new Response(JSON.stringify({ error: "invoiceId required" }), { status: 400, headers: corsHeaders })

    const { data: invoice, error } = await db
      .from("invoices")
      .select("id, org_id, customer_id, invoice_number, due_date, total, currency, token, from_details, customer_details")
      .eq("id", invoiceId)
      .single()

    if (error || !invoice) return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: corsHeaders })
    if (!calledByWorker && invoice.org_id !== orgId) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })

    let from = invoice.from_details as Record<string, string> | null
    let customer = invoice.customer_details as Record<string, string> | null

    if (!from) {
      const { data: org } = await db.from("organizations").select("name, email, logo_url, phone, tax_id, address_line1, country_code").eq("id", invoice.org_id).single()
      if (org) from = org as unknown as Record<string, string>
    }

    if (!customer && invoice.customer_id) {
      const { data: cust } = await db.from("customers").select("name, email, billing_email").eq("id", invoice.customer_id).single()
      if (cust) customer = cust as unknown as Record<string, string>
    }

    if (!from) return new Response(JSON.stringify({ error: "Could not resolve org details" }), { status: 422, headers: corsHeaders })
    if (!customer) return new Response(JSON.stringify({ error: "Could not resolve customer details" }), { status: 422, headers: corsHeaders })

    const recipientEmail = (customer.billing_email || customer.email) as string
    if (!recipientEmail) return new Response(JSON.stringify({ error: "Customer has no email" }), { status: 422, headers: corsHeaders })

    const { data: template } = await db
      .from("invoice_templates")
      .select("cc, bcc")
      .eq("org_id", invoice.org_id)
      .eq("is_default", true)
      .maybeSingle()

    const parseEmails = (raw: string | null | undefined) =>
      (raw ?? "").split(",").map((e) => e.trim()).filter(Boolean)

    const ccEmails = parseEmails(template?.cc)
    const bccEmails = parseEmails(template?.bcc)

    // Compute daysOverdue in the org owner's local timezone so the email subject
    // and body don't show the wrong count near midnight.
    const { data: ownerMember } = await db
      .from("organization_members")
      .select("users(timezone)")
      .eq("org_id", invoice.org_id)
      .eq("role", "owner")
      .eq("status", "active")
      .limit(1)
      .single()
    type TzField = { timezone: string | null } | null
    const ownerTz = (ownerMember?.users as unknown as TzField)?.timezone ?? "UTC"
    const todayLocal = new Date().toLocaleDateString("en-CA", { timeZone: ownerTz }) // "YYYY-MM-DD"
    const daysOverdue = invoice.due_date
      ? Math.max(0, Math.floor((new Date(todayLocal).getTime() - new Date(invoice.due_date).getTime()) / 86_400_000))
      : 0

    const publicUrl = invoice.token ? `${APP_URL}/i/${invoice.token}` : APP_URL
    const html = await render(
      React.createElement(InvoiceReminderEmail, {
        orgName: from.name,
        orgLogoUrl: from.logo_url,
        orgEmail: from.email,
        customerName: customer.name,
        invoiceNumber: invoice.invoice_number,
        dueDate: invoice.due_date,
        total: invoice.total,
        currency: invoice.currency,
        daysOverdue,
        publicUrl,
      })
    )

    const label = invoice.invoice_number ? `Invoice ${invoice.invoice_number}` : "Invoice"
    await resend.emails.send({
      from: `${from.name} <${FROM_EMAIL}>`,
      to: [recipientEmail],
      ...(ccEmails.length > 0 && { cc: ccEmails }),
      ...(bccEmails.length > 0 && { bcc: bccEmails }),
      replyTo: from.email,
      subject: `Reminder: ${label} from ${from.name} ${daysOverdue > 0 ? "is overdue" : "is due"}`,
      html,
    })

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (err) {
    console.error("send-invoice-reminder error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
