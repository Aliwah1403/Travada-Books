import { db } from "../_shared/db.ts"
import { isPaystackConfigured, NOT_CONFIGURED_MESSAGE, PaystackError } from "../_shared/paystack.ts"
import { verifyAndRecord } from "../_shared/record-gateway-payment.ts"

// Worker-only sweep (called every 15 min by the Trigger.dev task
// payments-reverify). Re-verifies `initialized` Paystack attempts that are
// older than 15 minutes (M-Pesa can be slow and webhooks can be missed) and
// younger than 48 hours, at most 50 per run, then marks anything still
// `initialized` after 48 hours as `abandoned`. Gated by X-Worker-Secret, like
// notify-invoice-overdue.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const WORKER_SHARED_SECRET = Deno.env.get("WORKER_SHARED_SECRET") ?? ""

const MIN_AGE_MS = 15 * 60 * 1000
const MAX_AGE_MS = 48 * 60 * 60 * 1000
const BATCH_SIZE = 50

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const workerSecret = req.headers.get("X-Worker-Secret") ?? ""
    const calledByWorker = WORKER_SHARED_SECRET.length > 0 && timingSafeEqual(workerSecret, WORKER_SHARED_SECRET)
    if (!calledByWorker) return json({ error: "Forbidden" }, 403)

    if (!isPaystackConfigured()) return json({ error: NOT_CONFIGURED_MESSAGE }, 503)

    const now = Date.now()
    const { data: attempts, error } = await db
      .from("payment_attempts")
      .select("reference")
      .eq("status", "initialized")
      .lt("created_at", new Date(now - MIN_AGE_MS).toISOString())
      .gt("created_at", new Date(now - MAX_AGE_MS).toISOString())
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE)
    if (error) throw error

    let succeeded = 0
    let failed = 0
    let pending = 0
    let errors = 0
    for (const attempt of attempts ?? []) {
      try {
        const outcome = await verifyAndRecord(attempt.reference)
        if (outcome.status === "succeeded") succeeded++
        else if (outcome.status === "failed") failed++
        else pending++
      } catch (err) {
        errors++
        console.error(
          `payments-reverify: ${attempt.reference} failed:`,
          err instanceof PaystackError ? `${err.status} ${err.message}` : err,
        )
      }
    }

    const { data: expired, error: expireError } = await db
      .from("payment_attempts")
      .update({ status: "abandoned", completed_at: new Date().toISOString() })
      .eq("status", "initialized")
      .lte("created_at", new Date(now - MAX_AGE_MS).toISOString())
      .select("reference")
    if (expireError) console.error("payments-reverify: abandon sweep failed:", expireError)

    return json({ ok: true, checked: attempts?.length ?? 0, succeeded, failed, pending, errors, abandoned: expired?.length ?? 0 })
  } catch (err) {
    console.error("payments-reverify error:", err)
    return json({ error: String(err) }, 500)
  }
})
