// Part-payment rules a business sets on an invoice (Option A, "Flexible pay").
// Stored as jsonb in `partial_payments` on invoices, invoice_templates and
// invoice_recurring. The server enforces them — invoice_partial_bounds in the
// 20261019000000 migration clamps whatever is stored — so this module only
// shapes values for the settings UI.

export type PartialPaymentRules = {
  enabled: boolean
  /** Per payment, % of the invoice total. */
  min_percent: number | null
  /** Per payment, major units. The higher of percent and amount wins. */
  min_amount: number | null
  /** First payment only, % of the invoice total. */
  deposit_percent: number | null
  /** Part-payments allowed until due date + N days (0 = the due date). */
  deadline_days: number | null
  /** Total payments allowed on the invoice, manual ones included. */
  max_payments: number | null
}

// Decision (2026-10-19): a percentage-only minimum of 20% by default.
export const DEFAULT_PARTIAL_RULES: PartialPaymentRules = {
  enabled: false,
  min_percent: 20,
  min_amount: null,
  deposit_percent: null,
  deadline_days: null,
  max_payments: null,
}

function numberOrNull(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Math.min(Math.max(value, min), max)
}

export function normalizePartialRules(
  raw: unknown,
  fallback: PartialPaymentRules = DEFAULT_PARTIAL_RULES,
): PartialPaymentRules {
  if (!raw || typeof raw !== "object") return fallback
  const r = raw as Record<string, unknown>
  return {
    enabled: r.enabled === true,
    min_percent: numberOrNull(r.min_percent, 0, 100),
    min_amount: numberOrNull(r.min_amount, 0, Number.MAX_SAFE_INTEGER),
    deposit_percent: numberOrNull(r.deposit_percent, 0, 100),
    deadline_days: numberOrNull(r.deadline_days, 0, 365),
    max_payments: numberOrNull(r.max_payments, 2, 12),
  }
}
