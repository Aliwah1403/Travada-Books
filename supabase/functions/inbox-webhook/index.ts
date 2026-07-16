// Public, unauthenticated inbound-email webhook. Resend POSTs here whenever
// mail arrives at *@inbox.travadasys.com. There is no getCallerOrgId — the
// ONLY trust boundary is the Svix signature below. Every field on the parsed
// payload (from, to, subject, attachment filenames/content) is attacker
// controllable and MUST be treated as untrusted: never interpolated into SQL
// filter strings, never trusted for auth, filenames sanitized before use in
// storage paths.
//
// Flow: verify signature -> parse recipient -> resolve org by inbox_id ->
// loop/Google-forwarding checks -> blocklist -> MIME/size filter -> upload to
// vault -> insert inbox_items row (status='processing') -> trigger
// process-inbox-attachment per item via the edge->worker bridge (same
// fetch-the-Trigger.dev-API pattern as trigger-process-inbox/index.ts).
//
// Always returns 2xx once the payload has been read and verified — including
// "ignored" cases (unknown inbox_id, blocklisted sender, no attachments) —
// so Resend doesn't retry forever. Only genuine transient failures (DB down,
// etc.) return 5xx.

import { Webhook } from "npm:svix@1"
import { Resend } from "npm:resend@6"
import { db } from "../_shared/db.ts"
import { FROM_EMAIL } from "../_shared/resend.ts"
import { fanOutInboxNotification } from "../_shared/notify-inbox.ts"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

const jsonHeaders = { "Content-Type": "application/json" }

// ── Filters (ported from Midday's inbox webhook, see INBOX-PLAN.md Phase 2) ──

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/octet-stream",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
])

function isAllowedAttachment(contentType: string): boolean {
  if (ALLOWED_MIME_TYPES.has(contentType)) return true
  // Covers png/jpeg/heic/heif/webp/etc — HEIC/HEIF is converted to JPEG later
  // by process-inbox-attachment, not here.
  return contentType.startsWith("image/")
}

// Kills email-signature logos and tracking pixels: small images almost never
// carry a real receipt/invoice. PDFs and octet-stream are exempt regardless
// of size.
const MIN_IMAGE_ATTACHMENT_BYTES = 100_000

function passesSizeFilter(contentType: string, size: number): boolean {
  if (contentType === "application/pdf" || contentType === "application/octet-stream") return true
  if (contentType.startsWith("image/") && size < MIN_IMAGE_ATTACHMENT_BYTES) return false
  return true
}

// Hard caps so a hostile/misconfigured sender can't exhaust storage or fan
// out an unbounded number of Trigger.dev runs from a single email.
const MAX_ATTACHMENTS_PER_EMAIL = 20
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024 // 25MB

// Addresses this system sends FROM — if a bounce/auto-reply/loop ever routes
// one of our own outbound emails back into the inbound webhook, drop it
// rather than re-ingesting it as an attachment.
const OWN_SEND_DOMAINS = new Set(["mail.travadasys.com"])
const GOOGLE_FORWARDING_CONFIRMATION_SENDER = "forwarding-noreply@google.com"

// ── Helpers ──────────────────────────────────────────────────────────────

function extractEmailAddress(raw: string | null | undefined): string {
  if (!raw) return ""
  const match = raw.match(/<?([^<>\s]+@[^<>\s]+)>?/)
  return (match?.[1] ?? raw).toLowerCase().trim()
}

function extractInboxId(toAddresses: string[]): string | null {
  for (const raw of toAddresses) {
    const email = extractEmailAddress(raw)
    const [local, domain] = email.split("@")
    if (domain === "inbox.travadasys.com" && local) return local
  }
  return null
}

function sanitizeFileName(name: string): string {
  const trimmed = (name || "attachment").slice(0, 200)
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_")
}

function withRandomSuffix(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".")
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 4)
  if (dotIndex <= 0) return `${fileName}_${rand}`
  return `${fileName.slice(0, dotIndex)}_${rand}${fileName.slice(dotIndex)}`
}

async function isSenderBlocked(orgId: string, senderEmail: string): Promise<boolean> {
  const domain = senderEmail.split("@")[1]?.toLowerCase() ?? ""
  const { data, error } = await db
    .from("inbox_blocklist")
    .select("type, value")
    .eq("org_id", orgId)

  if (error) {
    console.error("inbox-webhook: blocklist lookup failed:", error.message)
    return false // fail open — don't drop legitimate mail on a transient DB read error
  }

  // Compared in-memory rather than a PostgREST `.or()` filter string built
  // from senderEmail/domain — both are attacker-controlled and could contain
  // filter metacharacters.
  return (data ?? []).some(
    (row) =>
      (row.type === "email" && row.value === senderEmail) ||
      (row.type === "domain" && row.value === domain),
  )
}

// Mirrors Resend's AttachmentData (the shape returned by the dedicated
// attachment endpoints — the one that carries download_url). Distinct from the
// webhook payload's `attachments`, which is metadata-only.
type ReceivingAttachment = {
  id: string
  filename?: string | null
  content_type?: string | null
  size?: number | null
  download_url?: string | null
}

function attachmentContentType(a: ReceivingAttachment): string {
  return (a.content_type ?? "application/octet-stream").toLowerCase()
}

function attachmentDownloadUrl(a: ReceivingAttachment): string | null {
  return a.download_url ?? null
}

function attachmentMetaSize(a: ReceivingAttachment): number {
  return a.size ?? 0
}

// ── Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders })
  }

  // Raw text body — required for signature verification, must be read
  // before any JSON parsing.
  const payload = await req.text()

  const signingSecret = Deno.env.get("INBOX_WEBHOOK_SIGNING_SECRET")
  if (!signingSecret) {
    console.error("inbox-webhook: INBOX_WEBHOOK_SIGNING_SECRET not configured")
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers: jsonHeaders })
  }

  let event: { type?: string; data?: Record<string, unknown> }
  try {
    const wh = new Webhook(signingSecret)
    event = wh.verify(payload, {
      "svix-id": req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    }) as { type?: string; data?: Record<string, unknown> }
  } catch (err) {
    console.warn("inbox-webhook: signature verification failed:", err instanceof Error ? err.message : String(err))
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: jsonHeaders })
  }

  // Only email.received is subscribed, but be defensive in case the webhook
  // is ever expanded to other event types.
  if (event.type !== "email.received") {
    return new Response(JSON.stringify({ ok: true, ignored: "unhandled_event_type" }), { headers: jsonHeaders })
  }

  const data = event.data ?? {}
  const emailId = typeof data.email_id === "string" ? data.email_id : null
  const fromRaw = typeof data.from === "string" ? data.from : ""
  const senderEmail = extractEmailAddress(fromRaw)
  const toRaw = Array.isArray(data.to) ? (data.to as unknown[]).filter((t): t is string => typeof t === "string") : []
  const subject = typeof data.subject === "string" ? data.subject : null

  if (!emailId) {
    // Malformed payload we can't act on — acknowledge so Resend stops retrying.
    return new Response(JSON.stringify({ ok: true, ignored: "missing_email_id" }), { headers: jsonHeaders })
  }

  // Loop protection: never re-ingest our own outbound mail.
  const senderDomain = senderEmail.split("@")[1] ?? ""
  if (OWN_SEND_DOMAINS.has(senderDomain)) {
    console.info("inbox-webhook: ignoring mail from own send domain", { emailId, senderDomain })
    return new Response(JSON.stringify({ ok: true, ignored: "own_send_domain" }), { headers: jsonHeaders })
  }

  const inboxId = extractInboxId(toRaw)
  if (!inboxId) {
    return new Response(JSON.stringify({ ok: true, ignored: "no_inbox_recipient" }), { headers: jsonHeaders })
  }

  const { data: org, error: orgError } = await db
    .from("organizations")
    .select("id, name, email")
    .eq("inbox_id", inboxId)
    .maybeSingle()

  if (orgError) {
    console.error("inbox-webhook: org lookup failed:", orgError.message)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: jsonHeaders })
  }

  if (!org) {
    // Unknown inbox_id — don't leak whether it ever existed, just drop.
    return new Response(JSON.stringify({ ok: true, ignored: "unknown_inbox" }), { headers: jsonHeaders })
  }

  // Google Workspace auto-forwarding requires the user to click a
  // confirmation link mailed to the forwarding target. Since that target IS
  // our inbox address, Google's confirmation email would otherwise be
  // silently swallowed as an inbox attachment (it has none) — instead relay
  // it verbatim to the org's real email so the user can click "Confirm".
  if (senderEmail === GOOGLE_FORWARDING_CONFIRMATION_SENDER) {
    if (!org.email) {
      console.warn("inbox-webhook: google forwarding confirmation received but org has no email", { emailId, orgId: org.id })
      return new Response(JSON.stringify({ ok: true, ignored: "no_org_email_for_relay" }), { headers: jsonHeaders })
    }

    try {
      const { data: fullEmail, error: fetchError } = await resend.emails.receiving.get(emailId)
      if (fetchError || !fullEmail) throw new Error(fetchError?.message ?? "empty response")

      await resend.emails.send({
        from: `Travada Books Inbox <${FROM_EMAIL}>`,
        to: [org.email],
        subject: subject ?? "Confirm Gmail forwarding to your Travada Books inbox",
        html: (fullEmail as { html?: string | null }).html ?? undefined,
        text: (fullEmail as { text?: string | null }).text ?? "Please check your Travada Books inbox setup.",
      })
    } catch (err) {
      console.error("inbox-webhook: failed to relay google forwarding confirmation:", err instanceof Error ? err.message : String(err))
      // Genuinely transient (Resend API issue) — let Resend retry the webhook.
      return new Response(JSON.stringify({ error: "Relay failed" }), { status: 502, headers: jsonHeaders })
    }

    return new Response(JSON.stringify({ ok: true, relayed: "google_forwarding_confirmation" }), { headers: jsonHeaders })
  }

  if (senderEmail && (await isSenderBlocked(org.id, senderEmail))) {
    console.info("inbox-webhook: sender blocked", { emailId, orgId: org.id })
    return new Response(JSON.stringify({ ok: true, ignored: "blocked_sender" }), { headers: jsonHeaders })
  }

  // Fetch the authoritative attachment list (with download URLs) rather than
  // trusting the webhook payload's metadata-only `attachments` array.
  let attachments: ReceivingAttachment[] = []
  try {
    const { data: list, error: listError } = await resend.emails.receiving.attachments.list({ emailId })
    if (listError) throw new Error(listError.message)
    // Resend wraps list responses: { object: 'list', has_more, data: [...] }.
    // The array is one level deeper than the SDK's outer { data, error } tuple.
    attachments = ((list?.data ?? []) as unknown) as ReceivingAttachment[]
  } catch (err) {
    console.error("inbox-webhook: failed to list attachments:", err instanceof Error ? err.message : String(err))
    return new Response(JSON.stringify({ error: "Failed to fetch attachments" }), { status: 502, headers: jsonHeaders })
  }

  if (attachments.length === 0) {
    return new Response(JSON.stringify({ ok: true, ignored: "no_attachments" }), { headers: jsonHeaders })
  }

  const allowed = attachments
    .filter((a) => isAllowedAttachment(attachmentContentType(a)))
    .slice(0, MAX_ATTACHMENTS_PER_EMAIL)

  if (allowed.length === 0) {
    return new Response(JSON.stringify({ ok: true, ignored: "no_allowed_attachments" }), { headers: jsonHeaders })
  }

  const createdItemIds: string[] = []
  // First successfully-created item's display name — used as the inbox.new
  // notification's documentName fallback when the email has no subject.
  let firstDocumentName: string | null = null

  for (const attachment of allowed) {
    const contentType = attachmentContentType(attachment)
    const downloadUrl = attachmentDownloadUrl(attachment)
    const originalName = sanitizeFileName(attachment.filename ?? "attachment")

    if (!downloadUrl) {
      console.warn("inbox-webhook: attachment missing download_url, skipping", { emailId, originalName })
      continue
    }

    try {
      const res = await fetch(downloadUrl)
      if (!res.ok) throw new Error(`download failed: ${res.status}`)
      const buffer = await res.arrayBuffer()
      const size = buffer.byteLength

      if (size > MAX_ATTACHMENT_BYTES) {
        console.warn("inbox-webhook: attachment exceeds size cap, skipping", { emailId, originalName, size })
        continue
      }
      // Metadata size (if present) already filters most tracking pixels before
      // download; re-check against the actual downloaded size too, since
      // metadata fields are attacker-influenced and not guaranteed accurate.
      if (!passesSizeFilter(contentType, size) || !passesSizeFilter(contentType, attachmentMetaSize(attachment))) {
        continue
      }

      const uniqueName = withRandomSuffix(originalName)
      const filePath = `${org.id}/inbox/${uniqueName}`

      const { error: uploadError } = await db.storage
        .from("vault")
        .upload(filePath, new Uint8Array(buffer), { contentType, upsert: false })

      if (uploadError) {
        console.error("inbox-webhook: attachment upload failed:", uploadError.message, { emailId, originalName })
        continue
      }

      const referenceId = `${emailId}_${attachment.filename ?? originalName}`

      const { data: inserted, error: insertError } = await db
        .from("inbox_items")
        .insert({
          org_id: org.id,
          file_path: filePath,
          file_name: uniqueName,
          content_type: contentType,
          size,
          display_name: subject || originalName,
          sender_email: senderEmail || null,
          reference_id: referenceId,
          // 'new', NOT 'processing' — same as the manual-upload path. The
          // worker owns the 'processing' status: it treats a row already at
          // 'processing' as one another run has claimed, and skips it. Setting
          // it here would make every emailed attachment skip itself.
          status: "new",
          meta: { source: "email" },
        })
        .select("id")
        .single()

      if (insertError) {
        if (insertError.code === "23505") {
          // Redelivered webhook (Resend retries on non-200, or a duplicate
          // send) — this exact (messageId, filename) pair was already
          // ingested. Not an error, just a no-op.
          console.info("inbox-webhook: duplicate reference_id, skipping", { referenceId })
        } else {
          console.error("inbox-webhook: inbox_items insert failed:", insertError.message, { emailId, originalName })
        }
        // Storage now has an orphaned file on any insert failure; harmless —
        // vault paths are content-addressed by upload, not referenced elsewhere.
        continue
      }

      if (inserted) {
        createdItemIds.push(inserted.id)
        if (!firstDocumentName) firstDocumentName = subject || originalName
      }
    } catch (err) {
      console.error("inbox-webhook: attachment processing failed:", err instanceof Error ? err.message : String(err), {
        emailId,
        originalName,
      })
    }
  }

  if (createdItemIds.length === 0) {
    return new Response(JSON.stringify({ ok: true, created: 0 }), { headers: jsonHeaders })
  }

  // One inbox.new notification per email, not per attachment — non-fatal,
  // never let a Novu hiccup fail an otherwise-successful webhook.
  try {
    await fanOutInboxNotification("inbox.new", org.id, {
      documentName: subject || firstDocumentName || "New document",
      source: "email",
    })
  } catch (err) {
    console.error("inbox-webhook: inbox.new notification failed (non-fatal):", err instanceof Error ? err.message : String(err))
  }

  const triggerSecretKey = Deno.env.get("TRIGGER_SECRET_KEY")
  if (!triggerSecretKey) {
    console.error("inbox-webhook: TRIGGER_SECRET_KEY not configured — items created but not queued for processing")
  } else {
    await Promise.allSettled(
      createdItemIds.map(async (inboxItemId) => {
        const response = await fetch("https://api.trigger.dev/api/v1/tasks/process-inbox-attachment/trigger", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${triggerSecretKey}`,
          },
          body: JSON.stringify({ payload: { inboxItemId } }),
        })
        if (!response.ok) {
          const err = await response.text()
          console.error("inbox-webhook: failed to trigger process-inbox-attachment:", err, { inboxItemId })
        }
      }),
    )
  }

  return new Response(JSON.stringify({ ok: true, created: createdItemIds.length }), { headers: jsonHeaders })
})
