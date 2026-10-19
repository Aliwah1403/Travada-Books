import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { db } from "./db.ts"
import { resend, FROM_EMAIL } from "./resend.ts"
import { channelToMethod, toSubunit, verifyTransaction, type PaystackTransaction } from "./paystack.ts"
import { PaymentReceiptEmail } from "./emails/payment-receipt.tsx"

// The single place a Paystack payment becomes an invoice_payments row. Called
// by payments-webhook-paystack (charge.success), invoice-payment-status (the
// verify fallback) and payments-reverify (the scheduled sweep). Idempotent:
// invoice_payments_gateway_ref_key is a unique partial index on
// gateway_reference, so a second call for the same reference is a no-op.
//
// Nothing in `tx` is trusted until it is cross-checked against the
// payment_attempts row we created ourselves (status, amount in subunits,
// currency, reference). The invoice balance triggers
// (sync_invoice_payment_state) derive paid / partially_paid from the insert.

const WORKER_SHARED_SECRET = Deno.env.get("WORKER_SHARED_SECRET") ?? ""
const APP_URL = Deno.env.get("APP_URL") ?? "https://app.travadabooks.com"

const METHOD_LABELS: Record<string, string> = {
  mpesa: "M-Pesa",
  card: "Card",
  bank_transfer: "Bank transfer",
  other: "Online payment",
}

export type RecordResult =
  | { outcome: "recorded" }
  | { outcome: "already_recorded" }
  | { outcome: "not_successful" }
  | { outcome: "mismatch" }
  | { outcome: "unknown_reference" }

// Business notifications: notify-invoice-paid when the payment settles the
// invoice, notify-invoice-payment-received for a part-payment. Non-fatal — the
// payment is already recorded.
async function notifyBusiness(fn: "notify-invoice-paid" | "notify-invoice-payment-received", body: Record<string, string>) {
  try {
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "X-Worker-Secret": WORKER_SHARED_SECRET,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) console.warn(`record-gateway-payment: ${fn} returned ${res.status}`, body)
  } catch (err) {
    console.warn(`record-gateway-payment: ${fn} threw:`, err)
  }
}

// Our own receipt to whoever paid (Paystack sends a separate transaction
// receipt). Sent as the business with Reply-To set to them, once per payment:
// it only runs after the insert that owns this reference succeeded, and the
// Resend idempotency key covers retries. Best-effort — never fails the payment.
async function sendPaymentReceipt(
  reference: string,
  displayReference: string,
  payerEmail: string | null,
  invoiceId: string,
  paidAt: string,
  method: string,
) {
  if (!payerEmail) return
  try {
    const { data: invoice, error } = await db
      .from("invoices")
      .select("invoice_number, token, total, amount_paid, currency, from_details, customer_details, customer_name")
      .eq("id", invoiceId)
      .single()
    if (error || !invoice) throw error ?? new Error("invoice not found")

    const from = (invoice.from_details ?? {}) as Record<string, string | null>
    const customer = (invoice.customer_details ?? {}) as Record<string, string | null>
    const orgName = from.name ?? "The business"
    const { data: attempt } = await db.from("payment_attempts").select("amount").eq("reference", reference).single()
    const amountPaid = Number(attempt?.amount ?? 0)
    const balanceDue = Math.max(Math.round((Number(invoice.total ?? 0) - Number(invoice.amount_paid ?? 0)) * 100) / 100, 0)
    const label = invoice.invoice_number ? `Invoice ${invoice.invoice_number}` : "your invoice"

    const html = await render(
      React.createElement(PaymentReceiptEmail, {
        orgName,
        orgLogoUrl: from.logo_url ?? null,
        orgEmail: from.email ?? null,
        customerName: customer.name ?? invoice.customer_name ?? "there",
        invoiceNumber: invoice.invoice_number,
        amountPaid,
        currency: invoice.currency,
        paidAt,
        methodLabel: METHOD_LABELS[method] ?? METHOD_LABELS.other,
        reference: displayReference,
        balanceDue,
        publicUrl: `${APP_URL}/i/${invoice.token}`,
      }),
    )

    const { error: sendError } = await resend.emails.send(
      {
        from: `${orgName} <${FROM_EMAIL}>`,
        to: [payerEmail],
        ...(from.email ? { replyTo: from.email } : {}),
        subject: `Payment received for ${label}`,
        html,
      },
      { idempotencyKey: `payment-receipt-${reference}` },
    )
    if (sendError) console.warn(`record-gateway-payment: receipt email failed for ${reference}:`, sendError.message)
  } catch (err) {
    console.warn(`record-gateway-payment: receipt email threw for ${reference}:`, err)
  }
}

export async function recordGatewayPayment(reference: string, tx: PaystackTransaction): Promise<RecordResult> {
  const { data: attempt, error } = await db
    .from("payment_attempts")
    .select("reference, org_id, invoice_id, amount, currency, status, payer_email")
    .eq("reference", reference)
    .maybeSingle()

  if (error) throw error
  if (!attempt) {
    console.warn(`record-gateway-payment: no payment_attempt for reference ${reference}`)
    return { outcome: "unknown_reference" }
  }

  if (tx.status !== "success") return { outcome: "not_successful" }

  const attemptSubunit = toSubunit(Number(attempt.amount))
  if (tx.reference !== reference || tx.amount !== attemptSubunit || tx.currency !== attempt.currency) {
    console.error(
      `record-gateway-payment: MISMATCH for ${reference} — expected ${attemptSubunit} ${attempt.currency}, ` +
        `got ${tx.amount} ${tx.currency} (tx.reference=${tx.reference}). Payment NOT recorded; staff must review.`,
    )
    await db
      .from("payment_attempts")
      .update({ status: "failed", gateway_message: "amount_mismatch", completed_at: new Date().toISOString() })
      .eq("reference", reference)
    return { outcome: "mismatch" }
  }

  const paidAt = tx.paid_at && !Number.isNaN(Date.parse(tx.paid_at)) ? tx.paid_at : new Date().toISOString()
  const channel = tx.channel ?? null
  // The reference people recognise: the M-Pesa code for mobile money, else ours.
  // gateway_reference always keeps ours (idempotency + Paystack lookups); the
  // sync_payment_transaction trigger copies `reference` onto the transaction.
  const receipt = typeof tx.receipt_number === "string" ? tx.receipt_number.trim().slice(0, 64) : ""
  const displayReference = receipt || reference

  const { error: insertError } = await db.from("invoice_payments").insert({
    org_id: attempt.org_id,
    invoice_id: attempt.invoice_id,
    amount: attempt.amount,
    currency: attempt.currency,
    paid_at: paidAt,
    method: channelToMethod(channel),
    source: "gateway",
    gateway_reference: reference,
    reference: displayReference,
    note: receipt ? `Paid online via Paystack (${reference})` : "Paid online via Paystack",
  })

  let inserted = true
  if (insertError) {
    if (insertError.code === "23505") {
      inserted = false // already recorded by another path (webhook vs verify race)
    } else {
      throw insertError
    }
  }

  await db
    .from("payment_attempts")
    .update({ status: "succeeded", channel, completed_at: new Date().toISOString(), gateway_message: null })
    .eq("reference", reference)

  if (!inserted) return { outcome: "already_recorded" }

  await sendPaymentReceipt(reference, displayReference, attempt.payer_email, attempt.invoice_id, paidAt, channelToMethod(channel))

  const { data: invoice } = await db.from("invoices").select("status").eq("id", attempt.invoice_id).maybeSingle()
  if (invoice?.status === "paid") await notifyBusiness("notify-invoice-paid", { invoiceId: attempt.invoice_id })
  else if (invoice?.status === "partially_paid") await notifyBusiness("notify-invoice-payment-received", { reference })

  return { outcome: "recorded" }
}

export type VerifyOutcome =
  | { status: "succeeded" }
  | { status: "pending" }
  | { status: "failed"; message: string }

/**
 * Asks Paystack for the truth about a reference (GET /transaction/verify) and
 * applies it. Used by invoice-payment-status (payer-facing) and
 * payments-reverify (scheduled sweep). Safe to call repeatedly.
 *
 * Paystack reports "abandoned" for a checkout that simply hasn't been paid
 * (yet), including M-Pesa prompts still waiting for the PIN, so it is treated
 * as pending here; payments-reverify marks attempts abandoned after 48 h.
 */
export async function verifyAndRecord(reference: string): Promise<VerifyOutcome> {
  const tx = await verifyTransaction(reference)

  if (tx.status === "success") {
    const result = await recordGatewayPayment(reference, tx)
    if (result.outcome === "recorded" || result.outcome === "already_recorded") return { status: "succeeded" }
    if (result.outcome === "mismatch") return { status: "failed", message: "We couldn't confirm this payment. Please contact the business." }
    return { status: "pending" }
  }

  if (tx.status === "failed" || tx.status === "reversed") {
    console.warn(`verifyAndRecord: ${reference} ${tx.status} (${tx.gateway_response ?? tx.message ?? "no message"})`)
    await db
      .from("payment_attempts")
      .update({
        status: "failed",
        channel: tx.channel ?? null,
        gateway_message: (tx.gateway_response ?? tx.message ?? tx.status).slice(0, 300),
        completed_at: new Date().toISOString(),
      })
      .eq("reference", reference)
      .eq("status", "initialized")
    return { status: "failed", message: "The payment didn't go through. You haven't been charged." }
  }

  return { status: "pending" }
}
