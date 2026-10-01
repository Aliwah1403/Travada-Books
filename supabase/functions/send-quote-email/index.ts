import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { getCallerOrgId } from "../_shared/auth.ts"
import { QuoteSentEmail } from "../_shared/emails/quote-sent.tsx"
import { downloadPdfAttachment } from "../_shared/pdf-attachment.ts"
import { setEmailStatus } from "../_shared/email-status.ts"

const APP_URL = Deno.env.get("APP_URL") ?? "https://app.travadabooks.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}
const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" }

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

type QuoteRow = {
  id: string
  org_id: string
  quote_number: string | null
  issue_date: string | null
  valid_until: string | null
  total: number | null
  currency: string
  line_items: unknown
  note: string | null
  token: string | null
  from_details: Record<string, string> | null
  customer_details: Record<string, string> | null
  include_pdf: boolean
  file_path: string | null
}

async function sendQuoteEmail(params: {
  quote: QuoteRow
  from: Record<string, string>
  customer: Record<string, string>
  recipientEmail: string
  attachment: { filename: string; content: string } | null
  resendIdempotencyKey?: string
}): Promise<Response> {
  const { quote, from, customer, recipientEmail, attachment, resendIdempotencyKey } = params

  const { data: template } = await db
    .from("quote_templates")
    .select("cc, bcc")
    .eq("org_id", quote.org_id)
    .eq("is_default", true)
    .maybeSingle()

  const parseEmails = (raw: string | null | undefined) =>
    (raw ?? "").split(",").map((e) => e.trim()).filter(Boolean)

  const ccEmails = parseEmails(template?.cc)
  const bccEmails = parseEmails(template?.bcc)

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
      pdfAttached: !!attachment,
    })
  )

  const subject = `Quote${quote.quote_number ? ` ${quote.quote_number}` : ""} from ${from.name}`
  const { error: sendError } = await resend.emails.send(
    {
      from: `${from.name} <${FROM_EMAIL}>`,
      to: [recipientEmail],
      ...(ccEmails.length > 0 && { cc: ccEmails }),
      ...(bccEmails.length > 0 && { bcc: bccEmails }),
      replyTo: from.email,
      subject,
      html,
      ...(attachment && { attachments: [attachment] }),
    },
    resendIdempotencyKey ? { idempotencyKey: resendIdempotencyKey } : undefined,
  )

  // Resend returns errors rather than throwing — an unchecked call here would
  // report success to the caller (and the app) for a send that never went out.
  if (sendError) {
    await setEmailStatus("quotes", quote.id, "failed", sendError.message)
    return new Response(JSON.stringify({ error: `Resend error: ${sendError.message}` }), {
      status: 502,
      headers: JSON_HEADERS,
    })
  }

  await setEmailStatus("quotes", quote.id, "sent")
  return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS })
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

    const body = await req.json()
    const { quoteId } = body
    if (!quoteId) return new Response(JSON.stringify({ error: "quoteId required" }), { status: 400, headers: corsHeaders })

    // attachPdf/skipPdf/resendIdempotencyKey only mean anything coming from
    // apps/worker/src/trigger/generate-document-pdf.ts — never trust a
    // client-supplied value for these.
    const attachPdf = calledByWorker && body.attachPdf === true
    const skipPdf = calledByWorker && body.skipPdf === true
    const resendIdempotencyKey: string | undefined =
      calledByWorker && typeof body.resendIdempotencyKey === "string" ? body.resendIdempotencyKey : undefined

    const { data: quote, error } = await db
      .from("quotes")
      .select("id, org_id, quote_number, issue_date, valid_until, total, currency, line_items, note, token, from_details, customer_details, include_pdf, file_path")
      .eq("id", quoteId)
      .single()

    if (error || !quote) return new Response(JSON.stringify({ error: "Quote not found" }), { status: 404, headers: corsHeaders })
    if (!calledByWorker && quote.org_id !== orgId) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })

    const from = quote.from_details as Record<string, string> | null
    const customer = quote.customer_details as Record<string, string> | null

    if (!from || !customer) {
      return new Response(JSON.stringify({ error: "Quote must be sent before emailing" }), { status: 422, headers: corsHeaders })
    }

    const recipientEmail = (customer.billing_email || customer.email) as string
    if (!recipientEmail) {
      // User-fixable (add an email to the customer), unlike the auth/lookup
      // failures above — worth surfacing as a delivery failure on the quote.
      await setEmailStatus("quotes", quote.id, "failed", "Customer has no email address on file.")
      return new Response(JSON.stringify({ error: "Customer has no email" }), { status: 422, headers: corsHeaders })
    }

    const wantsPdf = quote.include_pdf !== false && !skipPdf

    if (wantsPdf && attachPdf) {
      const attachment = quote.file_path
        ? await downloadPdfAttachment(quote.file_path, `${quote.quote_number ?? quote.id}.pdf`)
        : null
      return await sendQuoteEmail({ quote, from, customer, recipientEmail, attachment, resendIdempotencyKey })
    }

    if (wantsPdf) {
      const triggerSecretKey = Deno.env.get("TRIGGER_SECRET_KEY")
      if (triggerSecretKey) {
        try {
          const triggerRes = await fetch("https://api.trigger.dev/api/v1/tasks/generate-document-pdf/trigger", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${triggerSecretKey}`,
            },
            body: JSON.stringify({ payload: { kind: "quote", id: quoteId, sendEmail: true } }),
          })
          if (triggerRes.ok) {
            await setEmailStatus("quotes", quote.id, "queued")
            return new Response(JSON.stringify({ ok: true, queued: true }), { headers: JSON_HEADERS })
          }
          console.error("send-quote-email: generate-document-pdf trigger failed, sending without attachment", await triggerRes.text())
        } catch (err) {
          console.error("send-quote-email: generate-document-pdf trigger threw, sending without attachment", err)
        }
      } else {
        console.error("send-quote-email: TRIGGER_SECRET_KEY not configured, sending without attachment")
      }
    }

    return await sendQuoteEmail({ quote, from, customer, recipientEmail, attachment: null, resendIdempotencyKey })
  } catch (err) {
    console.error("send-quote-email error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
