import { supabase } from "@/lib/supabase"
import { PAYSTACK_MOCK } from "@/lib/features"
import { getInvoiceByToken, invoiceBalance } from "@/lib/queries/invoices"

export type PaymentAccountStatus = "active" | "pending_review" | "frozen" | "disabled"
export type PayoutType = "mobile_money" | "bank"

export interface PaymentAccount {
  id: string
  org_id: string
  provider: "paystack"
  payout_type: PayoutType
  payout_bank_name: string | null
  payout_account_last4: string | null
  settlement_label: string | null
  resolved_account_name: string | null
  currency: string
  status: PaymentAccountStatus
  cards_enabled: boolean
  per_payment_limit: number | null
  weekly_limit: number | null
  cards_hold_until: string | null
  frozen_at: string | null
  frozen_reason: string | null
  created_at: string
  updated_at: string
}

// Only the columns granted to `authenticated` — external_id, bank_code and
// last_error are server-only (see the payment_accounts migration).
export const PAYMENT_ACCOUNT_SELECT =
  "id, org_id, provider, payout_type, payout_bank_name, payout_account_last4, settlement_label, resolved_account_name, currency, status, cards_enabled, per_payment_limit, weekly_limit, cards_hold_until, frozen_at, frozen_reason, created_at, updated_at"

// Mirrors the tier defaults in supabase/functions/_shared/payment-risk.ts.
// KES, major units. "trusted" = cards_enabled.
export const TIER_LIMITS = {
  new: { perPayment: 150000, weekly: 300000 },
  trusted: { perPayment: 1000000, weekly: 3000000 },
}

export interface PayoutProvider {
  code: string
  name: string
}

export interface PayoutProviders {
  banks: PayoutProvider[]
  mobileMoney: PayoutProvider[]
}

export interface PayoutAccountInput {
  payoutType: PayoutType
  bankCode?: string
  accountNumber: string
}

export interface InvoicePayOptions {
  available: boolean
  cards: boolean
  per_payment_limit: number
  balance: number
  currency: string
  business_name: string
}

export interface StartedPayment {
  accessCode: string
  authorizationUrl: string
  reference: string
  amount: number
  currency: string
  channels: string[]
}

export interface PaymentCheck {
  status: "succeeded" | "pending" | "failed"
  message?: string
}

// Edge-function error that carries the server's friendly message and, for
// start-payment, the `code` ("limit") so the UI can react to it.
export class PaymentError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = "PaymentError"
    this.code = code
  }
}

// supabase.functions.invoke surfaces non-2xx as FunctionsHttpError with the raw
// Response on `.context` — the `{ error, code }` body lives there.
async function invokeFn<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (error) {
    let message = "Something went wrong. Please try again."
    let code: string | undefined
    const context = (error as { context?: unknown }).context
    if (context instanceof Response) {
      try {
        const json = (await context.json()) as { error?: string; code?: string }
        if (json.error) message = json.error
        code = json.code
      } catch {
        // body wasn't JSON — keep the generic message
      }
    }
    throw new PaymentError(message, code)
  }
  return data as T
}

// The function returns the safe account row — accept it bare or wrapped as
// `{ account }` so a small contract difference doesn't break the UI.
async function invokeAccountFn(body: Record<string, unknown>): Promise<PaymentAccount> {
  const data = await invokeFn<PaymentAccount | { account: PaymentAccount }>(
    "payments-connect-paystack",
    body,
  )
  return "account" in data ? data.account : data
}

// ─── Mock layer (PAYSTACK_MOCK) ─────────────────────────────────────────────
// In-memory only: resets on reload. Drive states from the console with
// window.__paystackMock.setStatus("frozen") / .setCards(true).

const MOCK_LATENCY_MS = 600
const MOCK_CHANGE_EVENT = "paystack-mock-change"

const mockDelay = () => new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))

let mockAccount: PaymentAccount | null = null
const mockPayments = new Map<string, { email: string; startedAt: number }>()

const MOCK_BANKS: PayoutProvider[] = [
  { code: "68", name: "Equity Bank" },
  { code: "01", name: "KCB Bank Kenya" },
  { code: "11", name: "Co-operative Bank of Kenya" },
  { code: "03", name: "Absa Bank Kenya" },
  { code: "31", name: "Stanbic Bank Kenya" },
  { code: "02", name: "Standard Chartered Bank Kenya" },
  { code: "07", name: "NCBA Bank Kenya" },
  { code: "57", name: "I&M Bank" },
  { code: "63", name: "Diamond Trust Bank" },
  { code: "70", name: "Family Bank" },
]

function emitMockChange() {
  window.dispatchEvent(new Event(MOCK_CHANGE_EVENT))
}

export function subscribeToMockPaymentAccount(listener: () => void): () => void {
  window.addEventListener(MOCK_CHANGE_EVENT, listener)
  return () => window.removeEventListener(MOCK_CHANGE_EVENT, listener)
}

function buildMockAccount(input: PayoutAccountInput, previous: PaymentAccount | null): PaymentAccount {
  const last4 = input.accountNumber.replace(/\D/g, "").slice(-4)
  const bankName =
    input.payoutType === "bank" ?
      (MOCK_BANKS.find((b) => b.code === input.bankCode)?.name ?? "Bank")
    : null
  const now = new Date().toISOString()
  return {
    id: previous?.id ?? "mock-payment-account",
    org_id: previous?.org_id ?? "mock-org",
    provider: "paystack",
    payout_type: input.payoutType,
    payout_bank_name: bankName,
    payout_account_last4: last4,
    settlement_label: bankName ? `${bankName} ••${last4}` : `M-Pesa ••${last4}`,
    resolved_account_name: "JANE W MWANGI",
    currency: "KES",
    status: previous?.status === "frozen" ? "frozen" : "active",
    cards_enabled: previous?.cards_enabled ?? false,
    per_payment_limit: previous?.per_payment_limit ?? null,
    weekly_limit: previous?.weekly_limit ?? null,
    cards_hold_until:
      previous ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
    frozen_at: previous?.frozen_at ?? null,
    frozen_reason: previous?.frozen_reason ?? null,
    created_at: previous?.created_at ?? now,
    updated_at: now,
  }
}

declare global {
  interface Window {
    __paystackMock?: {
      setStatus: (status: PaymentAccountStatus) => void
      setCards: (enabled: boolean) => void
    }
  }
}

if (PAYSTACK_MOCK && typeof window !== "undefined") {
  window.__paystackMock = {
    setStatus(status) {
      if (!mockAccount) return console.warn("[paystack mock] connect an account first")
      mockAccount = {
        ...mockAccount,
        status,
        frozen_at: status === "frozen" ? new Date().toISOString() : null,
        frozen_reason: status === "frozen" ? "Dispute opened on a payment (inv-3f9a1c2e-mock)" : null,
      }
      emitMockChange()
    },
    setCards(enabled) {
      if (!mockAccount) return console.warn("[paystack mock] connect an account first")
      mockAccount = { ...mockAccount, cards_enabled: enabled }
      emitMockChange()
    },
  }
}

// ─── Org-side (authenticated) ───────────────────────────────────────────────

export async function getPaymentAccount(orgId: string): Promise<PaymentAccount | null> {
  if (PAYSTACK_MOCK) {
    await mockDelay()
    return mockAccount ? { ...mockAccount, org_id: orgId } : null
  }

  const { data, error } = await supabase
    .from("payment_accounts")
    .select(PAYMENT_ACCOUNT_SELECT)
    .eq("org_id", orgId)
    .maybeSingle()

  if (error) throw error
  return data as PaymentAccount | null
}

export async function listPayoutProviders(): Promise<PayoutProviders> {
  if (PAYSTACK_MOCK) {
    await mockDelay()
    return { banks: MOCK_BANKS, mobileMoney: [{ code: "MPESA", name: "M-Pesa" }] }
  }
  return invokeFn<PayoutProviders>("payments-connect-paystack", { action: "banks" })
}

export async function connectPaystack(input: PayoutAccountInput): Promise<PaymentAccount> {
  if (PAYSTACK_MOCK) {
    await mockDelay()
    mockAccount = buildMockAccount(input, null)
    emitMockChange()
    return mockAccount
  }
  return invokeAccountFn({ action: "connect", ...input })
}

export async function changePayoutAccount(input: PayoutAccountInput): Promise<PaymentAccount> {
  if (PAYSTACK_MOCK) {
    await mockDelay()
    mockAccount = buildMockAccount(input, mockAccount)
    emitMockChange()
    return mockAccount
  }
  return invokeAccountFn({ action: "update", ...input })
}

export async function disconnectPaystack(): Promise<void> {
  if (PAYSTACK_MOCK) {
    await mockDelay()
    if (mockAccount) mockAccount = { ...mockAccount, status: "disabled" }
    emitMockChange()
    return
  }
  await invokeFn<unknown>("payments-connect-paystack", { action: "disconnect" })
}

export async function reconnectPaystack(): Promise<PaymentAccount> {
  if (PAYSTACK_MOCK) {
    await mockDelay()
    if (!mockAccount) throw new PaymentError("No payment account to reconnect.")
    mockAccount = { ...mockAccount, status: "active" }
    emitMockChange()
    return mockAccount
  }
  return invokeAccountFn({ action: "reconnect" })
}

// ─── Public (token-authorised, no login) ────────────────────────────────────

export async function getInvoicePayOptions(token: string): Promise<InvoicePayOptions | null> {
  if (PAYSTACK_MOCK) {
    // Derived from the invoice itself so the mock works in a fresh tab where the
    // in-memory mock account doesn't exist.
    const invoice = await getInvoiceByToken(token)
    const balance = invoiceBalance(invoice)
    const from = (invoice.from_details ?? {}) as Record<string, string | null>
    const open = ["unpaid", "partially_paid", "overdue"].includes(invoice.status)
    return {
      available: invoice.accept_payments && open && balance > 0,
      cards: mockAccount?.cards_enabled ?? false,
      per_payment_limit: TIER_LIMITS.new.perPayment,
      balance,
      currency: invoice.currency,
      business_name: from.name ?? "this business",
    }
  }

  const { data, error } = await supabase.rpc("get_invoice_pay_options", { p_token: token })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return (row as InvoicePayOptions | undefined) ?? null
}

export async function startInvoicePayment(token: string, email: string): Promise<StartedPayment> {
  if (PAYSTACK_MOCK) {
    await mockDelay()
    const options = await getInvoicePayOptions(token)
    const reference = `inv-mock-${Date.now().toString(36)}`
    mockPayments.set(reference, { email, startedAt: Date.now() })
    return {
      accessCode: "mock_access_code",
      authorizationUrl: "https://checkout.paystack.com/mock",
      reference,
      amount: options?.balance ?? 0,
      currency: options?.currency ?? "KES",
      channels: options?.cards ? ["mobile_money", "card"] : ["mobile_money"],
    }
  }
  return invokeFn<StartedPayment>("invoice-pay-paystack", { token, email })
}

export async function checkInvoicePayment(token: string, reference: string): Promise<PaymentCheck> {
  if (PAYSTACK_MOCK) {
    const attempt = mockPayments.get(reference)
    // Simulated "waiting for the M-Pesa PIN" window; unknown references (redirect
    // fallback after a reload) just succeed.
    if (attempt && Date.now() - attempt.startedAt < 2000) return { status: "pending" }
    if (attempt?.email.toLowerCase().includes("fail")) {
      return { status: "failed", message: "The M-Pesa request was declined." }
    }
    return { status: "succeeded" }
  }
  return invokeFn<PaymentCheck>("invoice-payment-status", { token, reference })
}
