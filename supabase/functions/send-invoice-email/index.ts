import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { getCallerOrgId } from "../_shared/auth.ts"
import { InvoiceSentEmail } from "../_shared/emails/invoice-sent.tsx"

const APP_URL = Deno.env.get("APP_URL") ?? "https://books.travadasys.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

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
      .select("id, org_id, invoice_number, issue_date, due_date, total, currency, line_items, payment_details, note, token, from_details, customer_details")
      .eq("id", invoiceId)
      .single()

    if (error || !invoice) return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: corsHeaders })
    if (!calledByWorker && invoice.org_id !== orgId) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })

    const from = invoice.from_details as Record<string, string> | null
    const customer = invoice.customer_details as Record<string, string> | null

    if (!from || !customer) {
      return new Response(JSON.stringify({ error: "Invoice must be sent before emailing" }), { status: 422, headers: corsHeaders })
    }

    const recipientEmail = (customer.billing_email || customer.email) as string
    if (!recipientEmail) return new Response(JSON.stringify({ error: "Customer has no email" }), { status: 422, headers: corsHeaders })

    const publicUrl = invoice.token ? `${APP_URL}/i/${invoice.token}` : APP_URL
    const html = await render(
      React.createElement(InvoiceSentEmail, {
        orgName: from.name,
        orgLogoUrl: from.logo_url,
        orgEmail: from.email,
        customerName: customer.name,
        invoiceNumber: invoice.invoice_number,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        total: invoice.total,
        currency: invoice.currency,
        lineItems: (invoice.line_items as []) ?? [],
        publicUrl,
        paymentDetails: invoice.payment_details,
        note: invoice.note,
      })
    )

    const subject = `Invoice${invoice.invoice_number ? ` ${invoice.invoice_number}` : ""} from ${from.name}`
    await resend.emails.send({
      from: `${from.name} <${FROM_EMAIL}>`,
      to: [recipientEmail],
      replyTo: from.email,
      subject,
      html,
    })

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (err) {
    console.error("send-invoice-email error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
