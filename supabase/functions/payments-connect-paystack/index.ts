import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { getCallerOrgId } from "../_shared/auth.ts"
import {
  createSubaccount,
  listKenyaBanks,
  listKenyaMobileMoney,
  NOT_CONFIGURED_MESSAGE,
  normaliseKenyanMsisdn,
  PaystackError,
  PaystackNotConfiguredError,
  updateSubaccount,
  isPaystackConfigured,
  type PaystackBankOption,
} from "../_shared/paystack.ts"
import { nameMatches } from "../_shared/payment-risk.ts"

// Owner-only management of the org's Paystack payout account (a Paystack
// subaccount under Travada's own account). Actions: banks | connect | update |
// disconnect | reconnect. `banks` is open to any active member; everything
// else requires organization_members.role = 'owner' for the caller's active
// org. Paystack's raw errors are logged, never returned.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Only the columns the client may see (matches the GRANT SELECT on payment_accounts).
const SAFE_COLUMNS =
  "id, created_at, updated_at, org_id, provider, payout_type, payout_bank_name, payout_account_last4, " +
  "settlement_label, resolved_account_name, currency, status, cards_enabled, per_payment_limit, " +
  "weekly_limit, cards_hold_until, frozen_at, frozen_reason"

const CARDS_HOLD_DAYS = 7
const BANK_CACHE_MS = 60 * 60 * 1000

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

let bankCache: { at: number; banks: PaystackBankOption[]; mobileMoney: PaystackBankOption[] } | null = null

async function getProviders() {
  if (bankCache && Date.now() - bankCache.at < BANK_CACHE_MS) return bankCache
  const [banks, mobile] = await Promise.all([listKenyaBanks(), listKenyaMobileMoney()])
  // v1 offers individual M-Pesa wallets only (no Till / Paybill).
  const mobileMoney = mobile.filter((m) => m.code === "MPESA")
  bankCache = { at: Date.now(), banks, mobileMoney }
  return bankCache
}

interface PayoutInput {
  payoutType: "mobile_money" | "bank"
  bankCode: string
  bankName: string
  accountNumber: string
  last4: string
  label: string
}

// Validates + normalises the payout details from the request body.
// Returns a friendly error string on invalid input.
async function resolvePayout(body: Record<string, unknown>): Promise<PayoutInput | string> {
  const payoutType = body.payoutType
  const rawAccount = typeof body.accountNumber === "string" ? body.accountNumber.trim() : ""

  if (payoutType === "mobile_money") {
    const msisdn = normaliseKenyanMsisdn(rawAccount)
    if (!msisdn) return "Enter a valid Kenyan M-Pesa number, like 0712 345 678."
    // Local 07…/01… form — confirmed accepted for bank_code MPESA (see _shared/paystack.ts).
    return {
      payoutType,
      bankCode: "MPESA",
      bankName: "M-Pesa",
      accountNumber: msisdn.local,
      last4: msisdn.local.slice(-4),
      label: `M-Pesa ••${msisdn.local.slice(-4)}`,
    }
  }

  if (payoutType === "bank") {
    const bankCode = typeof body.bankCode === "string" ? body.bankCode.trim() : ""
    const digits = rawAccount.replace(/[\s-]/g, "")
    if (!/^\d{5,20}$/.test(digits)) return "Enter a valid bank account number (5 to 20 digits)."
    const { banks } = await getProviders()
    const bank = banks.find((b) => b.code === bankCode)
    if (!bank) return "Choose a bank from the list."
    return {
      payoutType,
      bankCode: bank.code,
      bankName: bank.name,
      accountNumber: digits,
      last4: digits.slice(-4),
      label: `${bank.name} ••${digits.slice(-4)}`,
    }
  }

  return "Choose how you'd like to be paid: M-Pesa or a bank account."
}

async function loadAccount(orgId: string) {
  const { data, error } = await db
    .from("payment_accounts")
    .select("id, org_id, external_id, status, payout_type, resolved_account_name")
    .eq("org_id", orgId)
    .eq("provider", "paystack")
    .maybeSingle()
  if (error) throw error
  return data
}

async function loadSafeRow(id: string) {
  const { data, error } = await db.from("payment_accounts").select(SAFE_COLUMNS).eq("id", id).single()
  if (error) throw error
  return data
}

async function loadNameContext(orgId: string, userId: string) {
  const [{ data: org }, { data: user }] = await Promise.all([
    db.from("organizations").select("name").eq("id", orgId).single(),
    db.from("users").select("full_name, email, phone").eq("id", userId).single(),
  ])
  return {
    orgName: (org?.name as string | undefined) ?? "",
    fullName: (user?.full_name as string | null) ?? null,
    email: (user?.email as string | null) ?? null,
    phone: (user?.phone as string | null) ?? null,
  }
}

async function notifyOwnersPayoutChanged(orgId: string, orgName: string, label: string) {
  try {
    const { data: owners, error } = await db
      .from("organization_members")
      .select("users(email)")
      .eq("org_id", orgId)
      .eq("role", "owner")
      .eq("status", "active")
    if (error) throw error
    const emails = (owners ?? [])
      .map((o) => (o.users as unknown as { email: string } | null)?.email)
      .filter((e): e is string => !!e)
    if (emails.length === 0) return
    await resend.emails.send({
      from: `Travada Books <${FROM_EMAIL}>`,
      to: emails,
      subject: "Your payout account was changed",
      text:
        `The payout account for ${orgName} on Travada Books was just changed to ${label}.\n\n` +
        `For your protection, card payments are paused for ${CARDS_HOLD_DAYS} days after a change like this.\n\n` +
        `If this wasn't you, sign in and review your payment settings straight away, then contact support.`,
    })
  } catch (err) {
    console.error("payments-connect-paystack: owner email failed:", err)
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    if (!isPaystackConfigured()) return json({ error: NOT_CONFIGURED_MESSAGE }, 503)

    const auth = await getCallerOrgId(req)
    if ("error" in auth) return new Response(auth.error.body, { status: auth.error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    const { orgId, userId } = auth

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return json({ error: "Invalid request." }, 400)
    }
    const action = body.action

    // Members can list providers; everything else is owner-only.
    if (action === "banks") {
      const { banks, mobileMoney } = await getProviders()
      return json({ banks, mobileMoney })
    }

    if (action !== "connect" && action !== "update" && action !== "disconnect" && action !== "reconnect") {
      return json({ error: "Unknown action." }, 400)
    }

    const { data: ownerRow, error: ownerError } = await db
      .from("organization_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle()
    if (ownerError) throw ownerError
    if (ownerRow?.role !== "owner") {
      return json({ error: "Only the workspace owner can manage payouts." }, 403)
    }

    const existing = await loadAccount(orgId)
    const names = await loadNameContext(orgId, userId)

    if (action === "connect") {
      if (existing) return json({ error: "A payout account is already connected." }, 409)

      const payout = await resolvePayout(body)
      if (typeof payout === "string") return json({ error: payout }, 400)

      let sub
      try {
        sub = await createSubaccount({
          businessName: names.orgName,
          bankCode: payout.bankCode,
          accountNumber: payout.accountNumber,
          description: `Travada Books org ${orgId}`,
          contactEmail: names.email ?? undefined,
          contactName: names.fullName ?? undefined,
          contactPhone: names.phone ?? undefined,
          metadata: { org_id: orgId },
        })
      } catch (err) {
        if (err instanceof PaystackError) {
          console.error(`payments-connect-paystack: create subaccount failed for org ${orgId}:`, err.message)
          return json({ error: "We couldn't verify that payout account. Check the details and try again." }, 400)
        }
        throw err
      }

      const resolvedName = sub.account_name?.trim() || null
      // No name returned: M-Pesa-only tier is low risk, go active. A returned name
      // that doesn't match the org or the connecting user goes to staff review.
      const status = resolvedName && !nameMatches(resolvedName, [names.orgName, names.fullName]) ? "pending_review" : "active"

      const { data: inserted, error: insertError } = await db
        .from("payment_accounts")
        .insert({
          org_id: orgId,
          provider: "paystack",
          mode: "subaccount",
          external_id: sub.subaccount_code,
          payout_type: payout.payoutType,
          payout_bank_code: payout.bankCode,
          payout_bank_name: payout.bankName,
          payout_account_last4: payout.last4,
          settlement_label: payout.label,
          resolved_account_name: resolvedName,
          currency: "KES",
          status,
        })
        .select("id")
        .single()
      if (insertError) {
        if (insertError.code === "23505") return json({ error: "A payout account is already connected." }, 409)
        // The subaccount now exists at Paystack without a row on our side. Log loudly for staff.
        console.error(`payments-connect-paystack: ORPHAN subaccount ${sub.subaccount_code} for org ${orgId} — insert failed:`, insertError)
        throw insertError
      }
      return json(await loadSafeRow(inserted.id))
    }

    // The remaining actions need an existing account.
    if (!existing || !existing.external_id) return json({ error: "No payout account is connected." }, 404)

    if (action === "update") {
      if (existing.status === "frozen") {
        return json({ error: "Payments are paused on this account. Please contact support." }, 403)
      }
      const payout = await resolvePayout(body)
      if (typeof payout === "string") return json({ error: payout }, 400)

      let sub
      try {
        sub = await updateSubaccount(existing.external_id, {
          bankCode: payout.bankCode,
          accountNumber: payout.accountNumber,
        })
      } catch (err) {
        if (err instanceof PaystackError) {
          console.error(`payments-connect-paystack: update subaccount failed for org ${orgId}:`, err.message)
          return json({ error: "We couldn't verify that payout account. Check the details and try again." }, 400)
        }
        throw err
      }

      const resolvedName = sub.account_name?.trim() || null
      const mismatch = !!resolvedName && !nameMatches(resolvedName, [names.orgName, names.fullName])
      const holdUntil = new Date(Date.now() + CARDS_HOLD_DAYS * 24 * 60 * 60 * 1000).toISOString()

      const { error: updateError } = await db
        .from("payment_accounts")
        .update({
          payout_type: payout.payoutType,
          payout_bank_code: payout.bankCode,
          payout_bank_name: payout.bankName,
          payout_account_last4: payout.last4,
          settlement_label: payout.label,
          resolved_account_name: resolvedName,
          cards_hold_until: holdUntil,
          ...(mismatch ? { status: "pending_review" } : {}),
        })
        .eq("id", existing.id)
      if (updateError) throw updateError

      await notifyOwnersPayoutChanged(orgId, names.orgName, payout.label)
      return json(await loadSafeRow(existing.id))
    }

    if (action === "disconnect") {
      if (existing.status === "frozen") {
        return json({ error: "Payments are paused on this account. Please contact support." }, 403)
      }
      try {
        await updateSubaccount(existing.external_id, { active: false })
      } catch (err) {
        if (err instanceof PaystackError) {
          console.error(`payments-connect-paystack: deactivate failed for org ${orgId}:`, err.message)
          return json({ error: "We couldn't disconnect right now. Please try again." }, 502)
        }
        throw err
      }
      const { error: updateError } = await db.from("payment_accounts").update({ status: "disabled" }).eq("id", existing.id)
      if (updateError) throw updateError
      return json(await loadSafeRow(existing.id))
    }

    // reconnect
    if (existing.status === "frozen") {
      return json({ error: "Payments are paused on this account. Please contact support." }, 403)
    }
    if (existing.status !== "disabled") return json({ error: "The payout account is already connected." }, 409)
    try {
      await updateSubaccount(existing.external_id, { active: true })
    } catch (err) {
      if (err instanceof PaystackError) {
        console.error(`payments-connect-paystack: reactivate failed for org ${orgId}:`, err.message)
        return json({ error: "We couldn't reconnect right now. Please try again." }, 502)
      }
      throw err
    }
    // Re-run the stored name check so a disconnect/reconnect can't skip review.
    const stored = existing.resolved_account_name as string | null
    const mismatch = !!stored && !nameMatches(stored, [names.orgName, names.fullName])
    const { error: updateError } = await db
      .from("payment_accounts")
      .update({ status: mismatch ? "pending_review" : "active" })
      .eq("id", existing.id)
    if (updateError) throw updateError
    return json(await loadSafeRow(existing.id))
  } catch (err) {
    if (err instanceof PaystackNotConfiguredError) return json({ error: NOT_CONFIGURED_MESSAGE }, 503)
    console.error("payments-connect-paystack error:", err)
    return json({ error: "Something went wrong on our side. Please try again." }, 500)
  }
})
