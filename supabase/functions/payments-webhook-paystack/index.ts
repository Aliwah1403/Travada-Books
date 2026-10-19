// DEV NOTE — Paystack webhook endpoint.
//   Set the webhook URL in the Paystack dashboard (Settings -> API Keys & Webhooks) to
//     <SUPABASE_URL>/functions/v1/payments-webhook-paystack
//   (test and live keys have separate webhook URLs). Paystack can't deliver
//   events to localhost, so local testing needs a tunnel (ngrok / cloudflared
//   pointed at `supabase functions serve`), or rely on the verify path:
//   `invoice-payment-status` and the `payments-reverify` sweep call
//   GET /transaction/verify/:reference and record the payment without a webhook.
//
// Public, unauthenticated endpoint (verify_jwt = false). The ONLY trust
// boundary is the x-paystack-signature header: HMAC-SHA512 (hex) of the RAW
// request body keyed with PAYSTACK_SECRET_KEY. The body is read with
// req.text() before anything else, and nothing in the payload is trusted
// afterwards except values cross-checked against our own payment_attempts row
// (see _shared/record-gateway-payment.ts).
//
// Idempotency: Paystack sends no event id, so we insert an event key into
// payment_webhook_events first ("<event>:<data.reference>" for charge.*,
// "<event>:<data.id>:<data.status>" for disputes). A duplicate returns 200
// immediately. If handling fails we delete the key and return 500 so Paystack's
// retry (live: every 3 min x4 then hourly for 72 h) can process it again.
//
// Events: charge.success -> record payment; charge.dispute.create|remind ->
// record dispute + freeze the org's payment account; charge.dispute.resolve ->
// update the dispute row only (staff decide whether to unfreeze); refund.* ->
// log only in v1; anything else -> 200.

import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import {
  fromSubunit,
  NOT_CONFIGURED_MESSAGE,
  PAYSTACK_WEBHOOK_IPS,
  PaystackNotConfiguredError,
  updateSubaccount,
  verifyWebhookSignature,
  type PaystackTransaction,
} from "../_shared/paystack.ts"
import { recordGatewayPayment } from "../_shared/record-gateway-payment.ts"

const jsonHeaders = { "Content-Type": "application/json" }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

// deno-lint-ignore no-explicit-any
type Json = any

function eventKeyFor(event: string, data: Json): string | null {
  if (event === "charge.success") return data?.reference ? `${event}:${data.reference}` : null
  if (event.startsWith("charge.dispute.")) {
    return data?.id !== undefined ? `${event}:${data.id}:${data.status ?? ""}` : null
  }
  if (event.startsWith("refund.")) {
    const ref = data?.transaction_reference ?? data?.id
    return ref ? `${event}:${ref}` : null
  }
  return null
}

async function emailOwnersDisputeFrozen(orgId: string, reference: string) {
  try {
    const [{ data: owners }, { data: org }] = await Promise.all([
      db.from("organization_members").select("users(email)").eq("org_id", orgId).eq("role", "owner").eq("status", "active"),
      db.from("organizations").select("name").eq("id", orgId).single(),
    ])
    const emails = (owners ?? [])
      .map((o) => (o.users as unknown as { email: string } | null)?.email)
      .filter((e): e is string => !!e)
    if (emails.length === 0) return
    await resend.emails.send({
      from: `Travada Books <${FROM_EMAIL}>`,
      to: emails,
      subject: "Online payments paused: a payment was disputed",
      text:
        `A customer disputed a payment (reference ${reference}) made to ${org?.name ?? "your business"} through Travada Books.\n\n` +
        `As a precaution we've paused online payments and held pending payouts while we look into it. ` +
        `Our team will be in touch. You can reply to this email or contact support if you have questions.`,
    })
  } catch (err) {
    console.error("payments-webhook-paystack: owner email failed:", err)
  }
}

async function handleDispute(event: string, data: Json) {
  const reference: string | null = data?.transaction?.reference ?? null
  const disputeId = data?.id !== undefined ? String(data.id) : null
  if (!disputeId) {
    console.warn(`payments-webhook-paystack: ${event} without dispute id, ignoring`)
    return
  }

  let attempt: { org_id: string; payment_account_id: string | null; invoice_id: string; currency: string } | null = null
  if (reference) {
    const { data: row, error } = await db
      .from("payment_attempts")
      .select("org_id, payment_account_id, invoice_id, currency")
      .eq("reference", reference)
      .maybeSingle()
    if (error) throw error
    attempt = row
  }

  const disputedAmount = data?.refund_amount ?? data?.transaction?.amount
  const { error: upsertError } = await db.from("payment_disputes").upsert(
    {
      org_id: attempt?.org_id ?? null,
      payment_account_id: attempt?.payment_account_id ?? null,
      invoice_id: attempt?.invoice_id ?? null,
      reference,
      provider_dispute_id: disputeId,
      status: data?.status ?? null,
      resolution: data?.resolution ?? null,
      category: data?.category ?? null,
      amount: typeof disputedAmount === "number" ? fromSubunit(disputedAmount) : null,
      currency: data?.currency ?? data?.transaction?.currency ?? attempt?.currency ?? null,
      due_at: data?.dueAt ?? data?.due_at ?? null,
      raw: data,
    },
    { onConflict: "provider_dispute_id" },
  )
  if (upsertError) throw upsertError

  if (event === "charge.dispute.resolve") {
    console.warn(`payments-webhook-paystack: dispute ${disputeId} resolved (${data?.resolution ?? "?"}); staff decide whether to unfreeze org ${attempt?.org_id ?? "?"}`)
    return
  }

  // create | remind: freeze the account straight away.
  if (!attempt?.payment_account_id) {
    console.error(`payments-webhook-paystack: STAFF ALERT dispute ${disputeId} (${reference}) has no matching payment account — freeze manually`)
    return
  }

  const { data: account, error: accountError } = await db
    .from("payment_accounts")
    .select("id, external_id, status")
    .eq("id", attempt.payment_account_id)
    .single()
  if (accountError) throw accountError
  if (account.status === "frozen") return

  const { error: freezeError } = await db
    .from("payment_accounts")
    .update({
      status: "frozen",
      frozen_at: new Date().toISOString(),
      frozen_reason: `Dispute opened on a payment (${reference})`,
    })
    .eq("id", account.id)
  if (freezeError) throw freezeError

  console.error(`payments-webhook-paystack: STAFF ALERT froze payment account ${account.id} (org ${attempt.org_id}) — dispute ${disputeId} on ${reference}`)

  // Deactivating the subaccount holds pending payouts. If this fails we throw so
  // Paystack retries; the DB freeze above is idempotent.
  if (account.external_id) await updateSubaccount(account.external_id, { active: false })

  await emailOwnersDisputeFrozen(attempt.org_id, reference ?? "unknown")
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  // Read the RAW body before anything else — the signature is over these exact bytes.
  const rawBody = await req.text()

  try {
    const valid = await verifyWebhookSignature(rawBody, req.headers.get("x-paystack-signature"))
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
    if (!valid) {
      console.warn(`payments-webhook-paystack: bad signature from ${ip || "unknown ip"}`)
      return json({ error: "Invalid signature" }, 401)
    }
    // IP is informational only: proxies make x-forwarded-for unreliable.
    if (ip && !PAYSTACK_WEBHOOK_IPS.includes(ip)) {
      console.warn(`payments-webhook-paystack: valid signature from non-Paystack IP ${ip}`)
    }

    let payload: { event?: string; data?: Json }
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return json({ error: "Invalid payload" }, 400)
    }
    const event = typeof payload.event === "string" ? payload.event : ""
    const data = payload.data

    const eventKey = eventKeyFor(event, data)
    if (!eventKey) {
      // Unknown or unkeyable event: acknowledge so Paystack doesn't retry.
      return json({ ok: true, ignored: true })
    }

    const { error: eventError } = await db
      .from("payment_webhook_events")
      .insert({ event_key: eventKey, provider: "paystack", event })
    if (eventError) {
      if (eventError.code === "23505") return json({ ok: true, duplicate: true })
      throw eventError
    }

    try {
      if (event === "charge.success") {
        const result = await recordGatewayPayment(data.reference, data as PaystackTransaction)
        console.log(`payments-webhook-paystack: charge.success ${data.reference} -> ${result.outcome}`)
      } else if (event.startsWith("charge.dispute.")) {
        await handleDispute(event, data)
      } else if (event.startsWith("refund.")) {
        console.log(`payments-webhook-paystack: ${event} for ${data?.transaction_reference ?? data?.id} (logged only, not handled in v1)`)
      }
    } catch (handlerErr) {
      // Let Paystack's retry reprocess this event.
      await db.from("payment_webhook_events").delete().eq("event_key", eventKey)
      throw handlerErr
    }

    return json({ ok: true })
  } catch (err) {
    if (err instanceof PaystackNotConfiguredError) return json({ error: NOT_CONFIGURED_MESSAGE }, 503)
    console.error("payments-webhook-paystack error:", err)
    return json({ error: "Internal error" }, 500)
  }
})
