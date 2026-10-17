// Trust tiers + helpers for the Paystack payment risk checks
// (Planning/INVOICE-PAYMENTS-PLAN.md §5). Limits are MAJOR units (KES).
// Keep TIER_LIMITS in sync with get_invoice_pay_options() in
// supabase/migrations/20261017000000_invoice_payments_paystack.sql and with
// TIER_LIMITS in apps/app/src/lib/queries/payment-accounts.ts.

export const TIER_LIMITS = {
  new: { perPayment: 150_000, weekly: 300_000 },
  trusted: { perPayment: 1_000_000, weekly: 3_000_000 },
} as const

export interface LimitableAccount {
  cards_enabled: boolean
  per_payment_limit: number | null
  weekly_limit: number | null
}

/** Effective limits for an account: explicit override, else the tier default (Trusted = cards_enabled). */
export function effectiveLimits(account: LimitableAccount): { perPayment: number; weekly: number } {
  const tier = account.cards_enabled ? TIER_LIMITS.trusted : TIER_LIMITS.new
  return {
    perPayment: account.per_payment_limit ?? tier.perPayment,
    weekly: account.weekly_limit ?? tier.weekly,
  }
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
}

function tokens(name: string): string[] {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

// Every token of `short` must be matched by a distinct token of `long`, either
// exactly or as an initial ("W" matches "WANJIKU").
function tokensCovered(short: string[], long: string[]): boolean {
  if (short.length === 0) return false
  const pool = [...long]
  for (const t of short) {
    let idx = pool.indexOf(t)
    if (idx === -1 && t.length === 1) idx = pool.findIndex((p) => p.startsWith(t))
    if (idx === -1 && t.length > 1) {
      // Allow the other direction too: the long side holds only an initial.
      idx = pool.findIndex((p) => p.length === 1 && t.startsWith(p))
    }
    if (idx === -1) return false
    pool.splice(idx, 1)
  }
  return true
}

/**
 * Loose match between the account-holder name Paystack resolved and any of the
 * candidate names (org name, caller's full name). Case, punctuation, order and
 * middle-name initials don't matter: "JANE W MWANGI" matches "Jane Wanjiku Mwangi".
 */
export function nameMatches(resolved: string, candidates: (string | null | undefined)[]): boolean {
  const a = tokens(resolved)
  if (a.length === 0) return false
  for (const cand of candidates) {
    if (!cand) continue
    const b = tokens(cand)
    if (b.length === 0) continue
    const [short, long] = a.length <= b.length ? [a, b] : [b, a]
    if (tokensCovered(short, long)) return true
  }
  return false
}
