import { db } from "../_shared/db.ts"
import {
  initializeTransaction,
  isPaystackConfigured,
  makeReference,
  NOT_CONFIGURED_MESSAGE,
  PaystackError,
  PaystackNotConfiguredError,
  toSubunit,
} from "../_shared/paystack.ts"
import { effectiveLimits, sha256Hex } from "../_shared/payment-risk.ts"

// Public, token-authorised endpoint behind the Pay button on /i/:token
// (verify_jwt = false — payers aren't signed in). The ONLY inputs are the
// invoice token, the payer's email and, when the invoice allows part-payments,
// the amount they chose. The balance is always computed here from the invoice
// row; a client amount is only accepted inside the bounds
// invoice_partial_bounds returns (via get_invoice_pay_options), never trusted.
//
// Flow: rate-limit (hashed IP + per invoice) -> load invoice -> guards ->
// amount (full balance, or a part-payment inside the invoice's rules) ->
// load active payment account -> limits -> channel decisions (card testing,
// self-payment, cards hold) -> reuse an open attempt or create one ->
// Paystack /transaction/initialize -> return access code.

const APP_URL = Deno.env.get("APP_URL") ?? "https://app.travadabooks.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const IP_RATE_LIMIT = 10 // attempts per hashed IP per hour
const INVOICE_OPEN_ATTEMPT_LIMIT = 5 // attempts per invoice per hour
const REUSE_WINDOW_MS = 30 * 60 * 1000
const CARD_TEST_FAILURES = 3
const HOUR_MS = 60 * 60 * 1000
const WEEK_MS = 7 * 24 * HOUR_MS

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

const round2 = (n: number) => Math.round(n * 100) / 100

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    if (!isPaystackConfigured()) return json({ error: NOT_CONFIGURED_MESSAGE }, 503)

    let body: { token?: unknown; email?: unknown; amount?: unknown }
    try {
      body = await req.json()
    } catch {
      return json({ error: "Invalid request." }, 400)
    }
    const token = typeof body.token === "string" ? body.token.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : ""
    if (!token || token.length > 200) return json({ error: "Invoice not found." }, 404)
    if (!EMAIL_RE.test(email)) return json({ error: "Enter a valid email address." }, 400)

    // Rate limit by hashed IP.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || ""
    const ipHash = ip ? await sha256Hex(ip) : null
    const hourAgo = new Date(Date.now() - HOUR_MS).toISOString()
    if (ipHash) {
      const { count, error } = await db
        .from("payment_attempts")
        .select("reference", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", hourAgo)
      if (error) throw error
      if ((count ?? 0) >= IP_RATE_LIMIT) {
        return json({ error: "Too many payment attempts. Please try again in a while." }, 429)
      }
    }

    const { data: invoice, error: invoiceError } = await db
      .from("invoices")
      .select("id, org_id, invoice_number, status, total, amount_paid, currency, accept_payments, token")
      .eq("token", token)
      .maybeSingle()
    if (invoiceError) throw invoiceError
    if (!invoice) return json({ error: "Invoice not found." }, 404)

    const unavailable = () =>
      json({ error: "This invoice can't be paid online right now.", code: "unavailable" }, 409)

    if (!invoice.accept_payments || !["unpaid", "partially_paid", "overdue"].includes(invoice.status)) {
      return unavailable()
    }
    // Balance is always derived server-side from the invoice row.
    const balance = round2(Number(invoice.total ?? 0) - Number(invoice.amount_paid ?? 0))
    if (!(balance > 0)) return unavailable()

    // Amount: the full balance unless the payer chose a part-payment, which
    // must sit inside the invoice's rules. Same function the public page reads.
    let amount = balance
    if (body.amount !== undefined && body.amount !== null) {
      const requested = typeof body.amount === "number" ? round2(body.amount) : NaN
      if (!Number.isFinite(requested) || requested <= 0) {
        return json({ error: "Enter a valid amount.", code: "amount" }, 400)
      }
      if (requested !== balance) {
        const { data: optionRows, error: optionsError } = await db.rpc("get_invoice_pay_options", { p_token: token })
        if (optionsError) throw optionsError
        const bounds = (Array.isArray(optionRows) ? optionRows[0] : optionRows) as
          | { partial: boolean; min_amount: number | string; max_partial: number | string | null }
          | undefined
        const min = Number(bounds?.min_amount)
        const maxPartial = bounds?.max_partial == null ? NaN : Number(bounds.max_partial)
        if (!bounds?.partial) {
          return json({ error: "This invoice has to be paid in full.", code: "amount" }, 400)
        }
        if (requested > balance) {
          return json({ error: "That's more than the balance due.", code: "amount" }, 400)
        }
        if (requested < min) {
          return json({ error: "That's below the minimum payment for this invoice.", code: "amount" }, 400)
        }
        if (!(requested <= maxPartial)) {
          return json(
            { error: "That would leave too little outstanding. Pay a smaller part or the full balance.", code: "amount" },
            400,
          )
        }
      }
      amount = requested
    }

    // Per-invoice rate limit: attempts created in the last hour.
    const { count: invoiceAttempts, error: invoiceAttemptsError } = await db
      .from("payment_attempts")
      .select("reference", { count: "exact", head: true })
      .eq("invoice_id", invoice.id)
      .gte("created_at", hourAgo)
    if (invoiceAttemptsError) throw invoiceAttemptsError
    if ((invoiceAttempts ?? 0) >= INVOICE_OPEN_ATTEMPT_LIMIT) {
      return json({ error: "Too many payment attempts on this invoice. Please try again in a while." }, 429)
    }

    const { data: account, error: accountError } = await db
      .from("payment_accounts")
      .select("id, external_id, status, currency, cards_enabled, cards_hold_until, per_payment_limit, weekly_limit")
      .eq("org_id", invoice.org_id)
      .eq("provider", "paystack")
      .maybeSingle()
    if (accountError) throw accountError
    if (!account || account.status !== "active" || !account.external_id || account.currency !== invoice.currency) {
      return unavailable()
    }

    // Limits (MAJOR units).
    const limits = effectiveLimits(account)
    const weekAgo = new Date(Date.now() - WEEK_MS).toISOString()
    const { data: weekRows, error: weekError } = await db
      .from("payment_attempts")
      .select("amount")
      .eq("org_id", invoice.org_id)
      .eq("status", "succeeded")
      .gte("created_at", weekAgo)
    if (weekError) throw weekError
    const weekTotal = (weekRows ?? []).reduce((sum, r) => sum + Number(r.amount), 0)
    if (amount > limits.perPayment || weekTotal + amount > limits.weekly) {
      console.warn(
        `invoice-pay-paystack: LIMIT hit for org ${invoice.org_id} invoice ${invoice.id}: amount ${amount}, ` +
          `perPayment ${limits.perPayment}, weekTotal ${weekTotal}, weekly ${limits.weekly}`,
      )
      return json(
        {
          error: "This business can't take an online payment this large yet. Please pay by bank transfer or contact them.",
          code: "limit",
        },
        422,
      )
    }

    // Channels: M-Pesa always; card only for trusted accounts outside the
    // post-payout-change hold, and not under the card-testing / self-payment guards.
    const flags: string[] = []
    let cardAllowed =
      account.cards_enabled === true &&
      (!account.cards_hold_until || new Date(account.cards_hold_until).getTime() < Date.now())

    if (cardAllowed) {
      const { count: cardFailures, error: cardError } = await db
        .from("payment_attempts")
        .select("reference", { count: "exact", head: true })
        .eq("invoice_id", invoice.id)
        .eq("status", "failed")
        .eq("channel", "card")
        .gte("created_at", hourAgo)
      if (cardError) throw cardError
      if ((cardFailures ?? 0) >= CARD_TEST_FAILURES) {
        cardAllowed = false
        flags.push("card_testing_guard")
      }
    }

    const { data: members, error: membersError } = await db
      .from("organization_members")
      .select("email, users(email)")
      .eq("org_id", invoice.org_id)
    if (membersError) throw membersError
    const memberEmails = new Set<string>()
    for (const m of members ?? []) {
      if (m.email) memberEmails.add(String(m.email).toLowerCase())
      const userEmail = (m.users as unknown as { email: string | null } | null)?.email
      if (userEmail) memberEmails.add(userEmail.toLowerCase())
    }
    if (memberEmails.has(email)) {
      flags.push("self_payment")
      cardAllowed = false
    }

    const channels = cardAllowed ? ["mobile_money", "card"] : ["mobile_money"]
    const callbackUrl = `${APP_URL}/i/${token}`

    const respond = (a: { accessCode: string | null; authorizationUrl: string | null; reference: string }) =>
      json({
        accessCode: a.accessCode,
        authorizationUrl: a.authorizationUrl,
        reference: a.reference,
        amount,
        currency: invoice.currency,
        channels,
      })

    // Reuse an open attempt for the same invoice + amount + payer from the last
    // 30 minutes (double-tap / reload mid-payment) instead of creating a new one.
    // Matching the payer keeps the receipt email and the channel decisions
    // (self-payment guard) tied to whoever is actually paying.
    const reuseSince = new Date(Date.now() - REUSE_WINDOW_MS).toISOString()
    const { data: open, error: openError } = await db
      .from("payment_attempts")
      .select("reference, access_code, authorization_url")
      .eq("invoice_id", invoice.id)
      .eq("status", "initialized")
      .eq("amount", amount)
      .eq("payer_email", email)
      .not("access_code", "is", null)
      .gte("created_at", reuseSince)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (openError) throw openError
    if (open) {
      return respond({ accessCode: open.access_code, authorizationUrl: open.authorization_url, reference: open.reference })
    }

    const reference = makeReference(invoice.id)
    const { error: insertError } = await db.from("payment_attempts").insert({
      reference,
      org_id: invoice.org_id,
      invoice_id: invoice.id,
      payment_account_id: account.id,
      amount,
      currency: invoice.currency,
      status: "initialized",
      payer_email: email,
      ip_hash: ipHash,
      flags,
    })
    if (insertError) throw insertError

    let init
    try {
      init = await initializeTransaction({
        email,
        amountSubunit: toSubunit(amount),
        currency: invoice.currency,
        reference,
        callbackUrl,
        channels,
        subaccount: account.external_id,
        metadata: {
          invoice_id: invoice.id,
          org_id: invoice.org_id,
          invoice_number: invoice.invoice_number,
          cancel_action: callbackUrl,
        },
      })
    } catch (err) {
      if (err instanceof PaystackNotConfiguredError) throw err
      console.error(
        `invoice-pay-paystack: initialize failed for invoice ${invoice.id} (${reference}):`,
        err instanceof PaystackError ? `${err.status} ${err.message}` : err,
      )
      // Paystack validates the email more strictly than we do (e.g. it rejects
      // reserved domains like .example) — tell the payer to fix the field
      // instead of showing a generic retry message.
      const emailRejected = err instanceof PaystackError && err.status === 400 && /email/i.test(err.message)
      await db
        .from("payment_attempts")
        .update({
          status: "failed",
          gateway_message: emailRejected ? "email_rejected" : "initialize_failed",
          completed_at: new Date().toISOString(),
        })
        .eq("reference", reference)
      if (emailRejected) {
        return json({ error: "Paystack couldn't accept this email address. Check it and try again.", code: "email" }, 400)
      }
      return json({ error: "We couldn't start the payment. Please try again in a moment." }, 502)
    }

    const { error: updateError } = await db
      .from("payment_attempts")
      .update({ access_code: init.access_code, authorization_url: init.authorization_url })
      .eq("reference", reference)
    if (updateError) throw updateError

    return respond({ accessCode: init.access_code, authorizationUrl: init.authorization_url, reference })
  } catch (err) {
    if (err instanceof PaystackNotConfiguredError) return json({ error: NOT_CONFIGURED_MESSAGE }, 503)
    console.error("invoice-pay-paystack error:", err)
    return json({ error: "Something went wrong on our side. Please try again." }, 500)
  }
})
