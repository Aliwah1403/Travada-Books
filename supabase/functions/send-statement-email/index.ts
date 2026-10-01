import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { getCallerOrgId } from "../_shared/auth.ts"
import { StatementSentEmail } from "../_shared/emails/statement-sent.tsx"
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

type StatementRow = {
  id: string
  org_id: string
  token: string | null
  date_from: string
  date_to: string
  snapshot_data: unknown
  from_details: Record<string, string> | null
  customer_details: Record<string, string> | null
  include_pdf: boolean
  file_path: string | null
  opening_balance: number | null
  payments_snapshot: unknown
}

async function sendStatementEmail(params: {
  statement: StatementRow
  from: Record<string, string>
  customer: Record<string, string>
  recipientEmail: string
  attachment: { filename: string; content: string } | null
  resendIdempotencyKey?: string
}): Promise<Response> {
  const { statement, from, customer, recipientEmail, attachment, resendIdempotencyKey } = params

  const invoices = (Array.isArray(statement.snapshot_data) ? statement.snapshot_data : []) as Array<{ total?: number; status?: string; currency?: string }>
  const totalDebits = invoices.reduce((s, inv) => s + (inv.total ?? 0), 0)
  const openingBalance = statement.opening_balance ?? 0

  // payments_snapshot is null for statements generated before opening
  // balances existed — keep the legacy status==='paid' approximation for
  // those so old statements' emails don't change. New statements have real
  // payment records, so total up what was actually received.
  const paymentsSnapshot = Array.isArray(statement.payments_snapshot)
    ? (statement.payments_snapshot as Array<{ amount?: number }>)
    : null
  const totalCredits =
    paymentsSnapshot != null
      ? paymentsSnapshot.reduce((s, p) => s + (p.amount ?? 0), 0)
      : invoices.filter((inv) => inv.status === "paid").reduce((s, inv) => s + (inv.total ?? 0), 0)
  const totalOwing = openingBalance + totalDebits - totalCredits
  const currency = invoices[0]?.currency ?? (paymentsSnapshot?.[0] as { currency?: string } | undefined)?.currency ?? "USD"

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
      pdfAttached: !!attachment,
    })
  )

  const subject = `Account Statement from ${from.name}`
  const { error: sendError } = await resend.emails.send(
    {
      from: `${from.name} <${FROM_EMAIL}>`,
      to: [recipientEmail],
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
    await setEmailStatus("statements", statement.id, "failed", sendError.message)
    return new Response(JSON.stringify({ error: `Resend error: ${sendError.message}` }), {
      status: 502,
      headers: JSON_HEADERS,
    })
  }

  await setEmailStatus("statements", statement.id, "sent")
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
    const { statementId } = body
    if (!statementId) return new Response(JSON.stringify({ error: "statementId required" }), { status: 400, headers: corsHeaders })

    // attachPdf/skipPdf/resendIdempotencyKey only mean anything coming from
    // apps/worker/src/trigger/generate-document-pdf.ts — never trust a
    // client-supplied value for these.
    const attachPdf = calledByWorker && body.attachPdf === true
    const skipPdf = calledByWorker && body.skipPdf === true
    const resendIdempotencyKey: string | undefined =
      calledByWorker && typeof body.resendIdempotencyKey === "string" ? body.resendIdempotencyKey : undefined

    const { data: statement, error } = await db
      .from("statements")
      .select("id, org_id, token, date_from, date_to, snapshot_data, from_details, customer_details, include_pdf, file_path, opening_balance, payments_snapshot")
      .eq("id", statementId)
      .single()

    if (error || !statement) return new Response(JSON.stringify({ error: "Statement not found" }), { status: 404, headers: corsHeaders })
    if (!calledByWorker && statement.org_id !== orgId) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })

    const from = statement.from_details as Record<string, string> | null
    const customer = statement.customer_details as Record<string, string> | null

    if (!from || !customer) {
      return new Response(JSON.stringify({ error: "Statement has no snapshot data" }), { status: 422, headers: corsHeaders })
    }

    const recipientEmail = (customer.billing_email || customer.email) as string
    if (!recipientEmail) {
      // User-fixable (add an email to the customer), unlike the auth/lookup
      // failures above — worth surfacing as a delivery failure on the statement.
      await setEmailStatus("statements", statement.id, "failed", "Customer has no email address on file.")
      return new Response(JSON.stringify({ error: "Customer has no email" }), { status: 422, headers: corsHeaders })
    }

    const wantsPdf = statement.include_pdf !== false && !skipPdf

    if (wantsPdf && attachPdf) {
      const attachment = statement.file_path
        ? await downloadPdfAttachment(statement.file_path, `statement-${statement.date_from}-${statement.date_to}.pdf`)
        : null
      return await sendStatementEmail({ statement, from, customer, recipientEmail, attachment, resendIdempotencyKey })
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
            body: JSON.stringify({ payload: { kind: "statement", id: statementId, sendEmail: true } }),
          })
          if (triggerRes.ok) {
            await setEmailStatus("statements", statement.id, "queued")
            return new Response(JSON.stringify({ ok: true, queued: true }), { headers: JSON_HEADERS })
          }
          console.error("send-statement-email: generate-document-pdf trigger failed, sending without attachment", await triggerRes.text())
        } catch (err) {
          console.error("send-statement-email: generate-document-pdf trigger threw, sending without attachment", err)
        }
      } else {
        console.error("send-statement-email: TRIGGER_SECRET_KEY not configured, sending without attachment")
      }
    }

    return await sendStatementEmail({ statement, from, customer, recipientEmail, attachment: null, resendIdempotencyKey })
  } catch (err) {
    console.error("send-statement-email error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
