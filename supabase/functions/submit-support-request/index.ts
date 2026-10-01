import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { SupportRequestEmail } from "../_shared/emails/support-request.tsx"

// Public endpoint behind the travadabooks.com /contact form (verify_jwt =
// false — visitors aren't signed in). Accepts multipart/form-data, stores
// the request + attachments, and emails it to the support inbox with a BCC
// to travadasystems@gmail.com. Reply-To is the visitor, so replying from
// the inbox goes straight back to them.
//
// Abuse guards: a honeypot field, per-IP rate limit (hashed IP), field
// length caps, and attachment type/size/count limits.

const SUPPORT_INBOX = Deno.env.get("SUPPORT_INBOX_EMAIL") ?? "support@travadabooks.com"
const SUPPORT_BCC = "travadasystems@gmail.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Keep in sync with the option lists in apps/website/app/routes/contact.tsx.
const TOPICS: Record<string, string> = {
  help: "Help using Travada Books",
  bug: "Report a problem",
  account: "Account and sign-in",
  import: "Imports and data",
  billing: "Billing and plans",
  feature: "Feature request",
  privacy: "Privacy or data request",
  partnership: "Partnerships and press",
  other: "Something else",
}

const AREAS: Record<string, string> = {
  invoicing: "Invoicing",
  quotes: "Quotes",
  customers: "Customers and portal",
  transactions: "Statements and transactions",
  inbox: "Inbox and receipts",
  payments: "Payments",
  workspace: "Account and workspace",
  general: "Not sure / general",
}

const URGENCY: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
}

const MAX_FILES = 5
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_BYTES = 20 * 1024 * 1024
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "application/pdf"])
const RATE_LIMIT = 5 // requests per IP per hour

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function field(form: FormData, key: string, max: number): string {
  const value = form.get(key)
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

async function sha256(input: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
}

// Short, human-quotable reference, e.g. TB-7K2QXM (no 0/O/1/I).
function makeReference() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return "TB-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  return btoa(binary)
}

function safeFilename(name: string) {
  return name.replace(/[^\w.\- ]+/g, "_").slice(-120) || "attachment"
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return json({ error: "Invalid form submission." }, 400)
    }

    // Honeypot: real visitors never see or fill this field. Pretend it
    // worked so bots don't learn to skip it.
    if (field(form, "website", 200)) return json({ ok: true, reference: makeReference() })

    const name = field(form, "name", 120)
    const email = field(form, "email", 254).toLowerCase()
    const businessName = field(form, "business", 160) || null
    const topic = field(form, "topic", 40)
    const area = field(form, "area", 40) || null
    const urgency = field(form, "urgency", 20) || null
    const subject = field(form, "subject", 200)
    const message = field(form, "message", 10000)

    const errors: Record<string, string> = {}
    if (!name) errors.name = "Enter your name."
    if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address."
    if (!TOPICS[topic]) errors.topic = "Choose a topic."
    if (area && !AREAS[area]) errors.area = "Choose a product area."
    if (urgency && !URGENCY[urgency]) errors.urgency = "Choose an urgency."
    if (!subject) errors.subject = "Add a subject."
    if (message.length < 10) errors.message = "Tell us a little more (at least 10 characters)."

    const files = form.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0)
    if (files.length > MAX_FILES) errors.attachments = `Attach up to ${MAX_FILES} files.`
    else if (files.some((f) => !ALLOWED_TYPES.has(f.type))) errors.attachments = "Attachments must be PNG, JPG or PDF."
    else if (files.some((f) => f.size > MAX_FILE_BYTES)) errors.attachments = "Each file must be 10 MB or smaller."
    else if (files.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_BYTES) errors.attachments = "Attachments must add up to 20 MB or less."

    if (Object.keys(errors).length) return json({ error: "Check the highlighted fields.", fields: errors }, 400)

    // Rate limit by hashed IP.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || ""
    const ipHash = ip ? await sha256(ip) : null
    if (ipHash) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count } = await db
        .from("support_requests")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", since)
      if ((count ?? 0) >= RATE_LIMIT) {
        return json({ error: "You've sent several messages in the last hour. Please try again later, or email us directly." }, 429)
      }
    }

    const reference = makeReference()

    // Store attachments first so the row can point at them.
    const attachmentPaths: string[] = []
    const emailAttachments: { filename: string; content: string }[] = []
    for (const [i, file] of files.entries()) {
      const filename = safeFilename(file.name)
      const buffer = await file.arrayBuffer()
      const path = `${reference}/${i + 1}-${filename}`
      const { error: uploadError } = await db.storage
        .from("support-attachments")
        .upload(path, buffer, { contentType: file.type, upsert: false })
      if (uploadError) console.error("submit-support-request: upload failed:", uploadError)
      else attachmentPaths.push(path)
      emailAttachments.push({ filename, content: arrayBufferToBase64(buffer) })
    }

    const { data: row, error: insertError } = await db
      .from("support_requests")
      .insert({
        reference,
        name,
        email,
        business_name: businessName,
        topic,
        area,
        urgency,
        subject,
        message,
        attachment_paths: attachmentPaths,
        ip_hash: ipHash,
        user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      })
      .select("id, created_at")
      .single()
    if (insertError || !row) throw insertError ?? new Error("insert failed")

    const submittedAt = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Africa/Nairobi",
    }).format(new Date(row.created_at)) + " EAT"

    const html = await render(
      React.createElement(SupportRequestEmail, {
        reference,
        name,
        email,
        businessName,
        topicLabel: TOPICS[topic],
        areaLabel: area ? AREAS[area] : null,
        urgency,
        urgencyLabel: urgency ? URGENCY[urgency] : null,
        subject,
        message,
        attachmentNames: emailAttachments.map((a) => a.filename),
        submittedAt,
      }),
    )

    const urgencyPrefix = urgency === "urgent" || urgency === "high" ? `[${URGENCY[urgency]}] ` : ""
    const { error: sendError } = await resend.emails.send({
      from: `Travada Books Support <${FROM_EMAIL}>`,
      to: [SUPPORT_INBOX],
      bcc: [SUPPORT_BCC],
      replyTo: `${name} <${email}>`,
      subject: `${urgencyPrefix}${TOPICS[topic]}: ${subject} [${reference}]`,
      html,
      attachments: emailAttachments.length ? emailAttachments : undefined,
    })

    await db
      .from("support_requests")
      .update(sendError ? { email_status: "failed", email_error: sendError.message } : { email_status: "sent" })
      .eq("id", row.id)

    if (sendError) {
      // The request is saved, so it isn't lost — but tell the visitor the
      // truth so they can fall back to email.
      console.error("submit-support-request: resend rejected:", sendError)
      return json({ error: "We saved your message but couldn't deliver it to the team. Please email us directly.", reference }, 502)
    }

    return json({ ok: true, reference })
  } catch (err) {
    console.error("submit-support-request error:", err)
    return json({ error: "Something went wrong on our side. Please try again, or email us directly." }, 500)
  }
})
