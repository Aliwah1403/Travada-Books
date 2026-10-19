import { db } from "../_shared/db.ts"
import { isPaystackConfigured, NOT_CONFIGURED_MESSAGE, PaystackError, PaystackNotConfiguredError } from "../_shared/paystack.ts"
import { sha256Hex } from "../_shared/payment-risk.ts"
import { verifyAndRecord } from "../_shared/record-gateway-payment.ts"

// Public, token-authorised status check for the invoice page after the payer
// closes the Paystack sheet or returns from the redirect (?reference=...).
// verify_jwt = false. The reference must belong to the invoice identified by
// the token, so nobody can use this to verify (and thereby record) an
// arbitrary reference. If the attempt isn't recorded yet we ask Paystack
// (GET /transaction/verify) and record it idempotently — never from the
// redirect query string alone.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const RATE_LIMIT = 30 // checks per hashed IP per hour
const HOUR_MS = 60 * 60 * 1000

// There's no table behind this endpoint, so the limiter is a per-isolate
// sliding window. It bounds Paystack verify calls from one client on one
// instance; the token+reference ownership check is the real access control.
const hits = new Map<string, number[]>()

function rateLimited(key: string): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < HOUR_MS)
  if (recent.length >= RATE_LIMIT) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= HOUR_MS)) hits.delete(k)
  }
  return false
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    let body: { token?: unknown; reference?: unknown }
    try {
      body = await req.json()
    } catch {
      return json({ error: "Invalid request." }, 400)
    }
    const token = typeof body.token === "string" ? body.token.trim() : ""
    const reference = typeof body.reference === "string" ? body.reference.trim() : ""
    if (!token || token.length > 200 || !reference || reference.length > 100) {
      return json({ error: "Payment not found." }, 404)
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || ""
    if (ip && rateLimited(await sha256Hex(ip))) {
      return json({ error: "Too many checks. Please try again in a while." }, 429)
    }

    const { data: invoice, error: invoiceError } = await db.from("invoices").select("id").eq("token", token).maybeSingle()
    if (invoiceError) throw invoiceError
    if (!invoice) return json({ error: "Payment not found." }, 404)

    const { data: attempt, error: attemptError } = await db
      .from("payment_attempts")
      .select("reference, status")
      .eq("reference", reference)
      .eq("invoice_id", invoice.id)
      .maybeSingle()
    if (attemptError) throw attemptError
    if (!attempt) return json({ error: "Payment not found." }, 404)

    if (attempt.status === "succeeded") return json({ status: "succeeded" })

    if (!isPaystackConfigured()) return json({ error: NOT_CONFIGURED_MESSAGE }, 503)

    try {
      const outcome = await verifyAndRecord(reference)
      return json(outcome)
    } catch (err) {
      if (err instanceof PaystackNotConfiguredError) throw err
      if (err instanceof PaystackError) {
        // Paystack is slow or unreachable: don't tell the payer it failed.
        console.error(`invoice-payment-status: verify failed for ${reference}: ${err.status} ${err.message}`)
        return json({ status: "pending" })
      }
      throw err
    }
  } catch (err) {
    if (err instanceof PaystackNotConfiguredError) return json({ error: NOT_CONFIGURED_MESSAGE }, 503)
    console.error("invoice-payment-status error:", err)
    return json({ error: "Something went wrong on our side. Please try again." }, 500)
  }
})
