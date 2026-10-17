// Thin Paystack client + helpers shared by the payments-* / invoice-pay-* edge
// functions. Facts here were checked against paystack.com/docs (2026-10-17).
// Never log or return PAYSTACK_SECRET_KEY, and never forward Paystack's raw
// error message to a browser — log it and send a friendly message instead.

const PAYSTACK_BASE_URL = "https://api.paystack.co"

export const NOT_CONFIGURED_MESSAGE = "Online payments aren't configured yet."

// Source IPs Paystack documents for webhooks. Used for logging only; proxies
// make x-forwarded-for unreliable, so the signature is the real check.
export const PAYSTACK_WEBHOOK_IPS = ["52.31.139.75", "52.49.173.169", "52.214.14.220"]

export class PaystackNotConfiguredError extends Error {
  constructor() {
    super("PAYSTACK_SECRET_KEY is not set")
    this.name = "PaystackNotConfiguredError"
  }
}

export class PaystackError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "PaystackError"
    this.status = status
  }
}

export function getPaystackSecret(): string | null {
  const key = Deno.env.get("PAYSTACK_SECRET_KEY")
  return key && key.length > 0 ? key : null
}

export function isPaystackConfigured(): boolean {
  return getPaystackSecret() !== null
}

interface PaystackEnvelope<T> {
  status: boolean
  message: string
  data: T
}

export async function paystackRequest<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<T> {
  const secret = getPaystackSecret()
  if (!secret) throw new PaystackNotConfiguredError()

  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  let envelope: PaystackEnvelope<T> | null = null
  try {
    envelope = await res.json()
  } catch {
    // fall through — handled below
  }

  if (!res.ok || !envelope || envelope.status !== true) {
    throw new PaystackError(envelope?.message ?? `Paystack ${method} ${path} failed (${res.status})`, res.status)
  }
  return envelope.data
}

// ── Money ────────────────────────────────────────────────────────────────

/** Major units (KES 1,234.50) -> Paystack subunits (123450). */
export function toSubunit(major: number): number {
  return Math.round(major * 100)
}

export function fromSubunit(subunit: number): number {
  return subunit / 100
}

// ── References ───────────────────────────────────────────────────────────

/**
 * Paystack: "Only -, ., = and alphanumeric characters allowed" — no underscores.
 * Format: inv-<first 8 hex of invoice uuid>-<base36 timestamp>-<4 random alnum>.
 */
export function makeReference(invoiceId: string): string {
  const short = invoiceId.replace(/-/g, "").slice(0, 8).toLowerCase()
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  const rand = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")
  return `inv-${short}-${Date.now().toString(36)}-${rand}`
}

// ── Phone numbers ────────────────────────────────────────────────────────

/**
 * Accepts +2547XXXXXXXX, 2547XXXXXXXX, 07XXXXXXXX, 01XXXXXXXX, 7XXXXXXXX, 1XXXXXXXX
 * (spaces, dashes, parentheses ignored). Returns both forms or null.
 *
 * For bank_code MPESA, Paystack accepts the local `07…/01…` form as
 * `account_number` (confirmed in test mode 2026-10-17; the docs don't say).
 * Note: an MPESA subaccount comes back with `account_name: null`, so the
 * payout name check can't run for M-Pesa payouts.
 */
export function normaliseKenyanMsisdn(input: string): { local: string; international: string } | null {
  let digits = input.replace(/[^\d+]/g, "")
  if (digits.startsWith("+")) digits = digits.slice(1)
  if (digits.startsWith("254")) digits = digits.slice(3)
  else if (digits.startsWith("0")) digits = digits.slice(1)
  // National significant number: 9 digits starting 7 or 1.
  if (!/^[17]\d{8}$/.test(digits)) return null
  return { local: `0${digits}`, international: `254${digits}` }
}

// ── Channel mapping ──────────────────────────────────────────────────────

export type PaymentMethod = "mpesa" | "card" | "bank_transfer" | "other"

export function channelToMethod(channel: string | null | undefined): PaymentMethod {
  switch (channel) {
    case "mobile_money":
      return "mpesa"
    case "card":
      return "card"
    case "bank_transfer":
      return "bank_transfer"
    default:
      return "other"
  }
}

// ── Webhook signature ────────────────────────────────────────────────────

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

/** x-paystack-signature = HMAC-SHA512 (hex) of the RAW request body, keyed with the secret key. */
export async function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  const secret = getPaystackSecret()
  if (!secret) throw new PaystackNotConfiguredError()
  if (!signatureHeader) return false

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody))
  const expected = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("")
  return timingSafeEqual(expected, signatureHeader.trim().toLowerCase())
}

// ── Typed API helpers ────────────────────────────────────────────────────

export interface PaystackBank {
  name: string
  code: string
  slug?: string
  type?: string
  currency?: string
  active?: boolean
}

export interface PaystackBankOption {
  code: string
  name: string
}

/** GET /bank?country=kenya (banks). Follows the cursor so we get every page. */
export async function listKenyaBanks(): Promise<PaystackBankOption[]> {
  const out: PaystackBankOption[] = []
  let next: string | null = null
  for (let page = 0; page < 10; page++) {
    const qs = new URLSearchParams({ country: "kenya", perPage: "100", use_cursor: "true" })
    if (next) qs.set("next", next)
    const url = `/bank?${qs.toString()}`
    const secret = getPaystackSecret()
    if (!secret) throw new PaystackNotConfiguredError()
    // Cursor info lives in the envelope's `meta`, which paystackRequest drops, so call fetch directly here.
    const res = await fetch(`${PAYSTACK_BASE_URL}${url}`, {
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    })
    const json = await res.json().catch(() => null) as
      | { status: boolean; message: string; data: PaystackBank[]; meta?: { next?: string | null } }
      | null
    if (!res.ok || !json || json.status !== true) {
      throw new PaystackError(json?.message ?? `Paystack GET /bank failed (${res.status})`, res.status)
    }
    for (const b of json.data ?? []) {
      if (b.code && b.name && b.active !== false && b.type !== "mobile_money") out.push({ code: b.code, name: b.name })
    }
    next = json.meta?.next ?? null
    if (!next) break
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

/** GET /bank?currency=KES&type=mobile_money -> MPESA, MPPAYBILL, MPTILL. */
export async function listKenyaMobileMoney(): Promise<PaystackBankOption[]> {
  const data = await paystackRequest<PaystackBank[]>("GET", "/bank?currency=KES&type=mobile_money")
  return (data ?? []).filter((b) => b.code && b.name).map((b) => ({ code: b.code, name: b.name }))
}

export interface PaystackSubaccount {
  id: number
  subaccount_code: string
  business_name?: string
  account_name: string | null
  settlement_bank: string | null
  account_number: string | null
  currency: string | null
  is_verified: boolean | null
  settlement_schedule: string | null
  active: boolean | null
}

export interface CreateSubaccountInput {
  businessName: string
  bankCode: string
  accountNumber: string
  description?: string
  contactEmail?: string
  contactName?: string
  contactPhone?: string
  metadata?: Record<string, unknown>
}

export function createSubaccount(input: CreateSubaccountInput): Promise<PaystackSubaccount> {
  return paystackRequest<PaystackSubaccount>("POST", "/subaccount", {
    business_name: input.businessName,
    // Docs' param table says bank_code, their curl sample says settlement_bank — send both.
    bank_code: input.bankCode,
    settlement_bank: input.bankCode,
    account_number: input.accountNumber,
    percentage_charge: 0, // % the MAIN account gets — Travada takes 0%
    description: input.description,
    primary_contact_email: input.contactEmail,
    primary_contact_name: input.contactName,
    primary_contact_phone: input.contactPhone,
    metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
  })
}

export interface UpdateSubaccountInput {
  businessName?: string
  description?: string
  bankCode?: string
  accountNumber?: string
  active?: boolean
  metadata?: Record<string, unknown>
}

/** NOTE: settlement_schedule is NOT an accepted update param — never send it. */
export function updateSubaccount(idOrCode: string, input: UpdateSubaccountInput): Promise<PaystackSubaccount> {
  const body: Record<string, unknown> = {}
  if (input.businessName !== undefined) body.business_name = input.businessName
  if (input.description !== undefined) body.description = input.description
  if (input.bankCode !== undefined) {
    body.bank_code = input.bankCode
    body.settlement_bank = input.bankCode
  }
  if (input.accountNumber !== undefined) body.account_number = input.accountNumber
  if (input.active !== undefined) body.active = input.active
  if (input.metadata !== undefined) body.metadata = JSON.stringify(input.metadata)
  return paystackRequest<PaystackSubaccount>("PUT", `/subaccount/${encodeURIComponent(idOrCode)}`, body)
}

export interface InitializeTransactionInput {
  email: string
  amountSubunit: number
  currency: string
  reference: string
  callbackUrl: string
  channels: string[]
  subaccount: string
  metadata: Record<string, unknown>
}

export interface InitializedTransaction {
  authorization_url: string
  access_code: string
  reference: string
}

export function initializeTransaction(input: InitializeTransactionInput): Promise<InitializedTransaction> {
  return paystackRequest<InitializedTransaction>("POST", "/transaction/initialize", {
    email: input.email,
    amount: String(input.amountSubunit), // string, subunit
    currency: input.currency,
    reference: input.reference,
    callback_url: input.callbackUrl,
    channels: input.channels,
    subaccount: input.subaccount,
    bearer: "subaccount",
    metadata: JSON.stringify(input.metadata), // stringified JSON
  })
}

export interface PaystackTransaction {
  id?: number
  status: string // success | failed | abandoned | ongoing | pending | reversed ...
  reference: string
  amount: number // subunit integer
  currency: string
  channel: string | null
  paid_at: string | null
  gateway_response?: string | null
  message?: string | null
}

export function verifyTransaction(reference: string): Promise<PaystackTransaction> {
  return paystackRequest<PaystackTransaction>("GET", `/transaction/verify/${encodeURIComponent(reference)}`)
}
