import {
  addDays,
  computeStoredTotals,
  invoiceFromQuote,
  isPastValidUntil,
  isQuoteEditable,
  isQuoteSendable,
  normalizeCustomFields,
  toRateColumns,
} from "@travada-books/core"
import { eq, inArray, sql } from "drizzle-orm"
import { type DbOrTx, inOrg, withOrg } from "../db/client.js"
import { invoices, quoteTemplates, quotes } from "../db/schema.js"
import { mapDbError, ServiceError } from "../lib/errors.js"
import type { SendChannel } from "./invoice-schemas.js"
import {
  type CustomerRow,
  followUp,
  type FollowUp,
  getCustomer,
  getDefaultTemplate,
  getOrg,
  issueValues,
  lookupRate,
  nextInvoiceNumber,
  nowIso,
  num,
  type ServiceCtx,
} from "./invoices.js"
import type { SaveQuoteInput } from "./quote-schemas.js"

// Every quote write, in one place (API-WRITES-PLAN.md §6, domain 2). The /v1
// routes (the app) and the assistant's tools both call these.
//
// Behaviour mirrors what the app did in the browser before (quotes/create,
// edit, detail, quote-actions). New here: the owner can mark a quote accepted
// or declined on the customer's behalf (they said yes on the phone), and an
// accepted quote can be turned into its draft invoice if that step failed.
// The customer's own Accept/Decline on /q/:token stays in the accept-quote and
// decline-quote edge functions (D6).

const NUMBER_TAKEN = {
  quotes_quote_number_customer_id_key: {
    code: "QUOTE_NUMBER_TAKEN" as const,
    message: "That quote number is already used for this customer. Use a different number, or leave it blank to auto-generate one.",
    field: "quote_number",
  },
}

async function rethrow<T>(work: Promise<T>): Promise<T> {
  try {
    return await work
  } catch (error) {
    throw mapDbError(error, NUMBER_TAKEN)
  }
}

// ─── Loading ──────────────────────────────────────────────────────────────

export async function getQuoteRow(ctx: Pick<ServiceCtx, "db" | "orgId">, id: string) {
  const [row] = await ctx.db.select().from(quotes).where(inOrg(quotes, ctx.orgId, eq(quotes.id, id))).limit(1)
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Quote not found.")
  return row
}

export type QuoteRow = Awaited<ReturnType<typeof getQuoteRow>>

async function getQuoteTemplate(ctx: Pick<ServiceCtx, "db" | "orgId">) {
  const [row] = await ctx.db
    .select()
    .from(quoteTemplates)
    .where(inOrg(quoteTemplates, ctx.orgId, eq(quoteTemplates.isDefault, true)))
    .limit(1)
  return row ?? null
}

async function nextQuoteNumber(ctx: Pick<ServiceCtx, "db" | "orgId">): Promise<string> {
  const rows = await ctx.db.execute<{ n: string }>(sql`select public.next_quote_number(${ctx.orgId}::uuid) as n`)
  const n = rows[0]?.n
  if (!n) throw new Error("next_quote_number returned nothing")
  return n
}

/** The invoice made from this quote, if any. */
async function linkedInvoice(ctx: Pick<ServiceCtx, "db" | "orgId">, quoteId: string) {
  const [row] = await ctx.db
    .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, status: invoices.status })
    .from(invoices)
    .where(inOrg(invoices, ctx.orgId, eq(invoices.quoteId, quoteId)))
    .limit(1)
  return row ?? null
}

// ─── Create / edit ──────────────────────────────────────────────────────────

/** The document columns create and edit both write. */
async function documentValues(ctx: ServiceCtx, input: SaveQuoteInput, customer: CustomerRow) {
  const totals = computeStoredTotals(input.line_items, input.discount, input.vat_rate)
  const rates = toRateColumns(
    input.discount?.type ?? "%",
    input.discount ? String(input.discount.value) : "",
    input.vat_rate == null ? "" : String(input.vat_rate),
  )
  const needsTemplate = !input.settings || input.valid_until === undefined
  const [template, org] = await Promise.all([needsTemplate ? getQuoteTemplate(ctx) : null, getOrg(ctx)])

  const settings = input.settings ?? {
    include_pdf: template?.includePdf ?? true,
    quote_template: template?.quoteTemplate ?? "classic",
  }
  const validUntil =
    input.valid_until !== undefined
      ? input.valid_until
      : input.issue_date && template?.validityDays != null
        ? addDays(input.issue_date, template.validityDays)
        : null

  // The pages stored FX on every save (drafts included) so the quotes stats
  // can total in the base currency.
  const rate = await lookupRate(ctx, input.currency, org.baseCurrency)

  return {
    customerId: customer.id,
    customerName: customer.name,
    currency: input.currency,
    issueDate: input.issue_date,
    validUntil,
    lineItems: input.line_items,
    subtotal: num(totals.subtotal),
    taxAmount: num(totals.tax_amount),
    discount: num(totals.discount),
    vatRate: rates.vat_rate == null ? null : String(rates.vat_rate),
    discountPercent: rates.discount_percent == null ? null : String(rates.discount_percent),
    total: num(totals.total),
    exchangeRate: rate == null ? null : String(rate),
    convertedAmount: rate == null ? null : num(totals.total * rate),
    baseCurrency: org.baseCurrency,
    note: input.note || null,
    includePdf: settings.include_pdf,
    quoteTemplate: settings.quote_template,
    customFields: normalizeCustomFields(input.custom_fields),
  }
}

/** Issue-time columns: status, sent stamps and both snapshots. */
async function sentValues(ctx: ServiceCtx, customer: CustomerRow, channel: SendChannel, previousSentAt: string | null) {
  const { fromDetails, customerDetails } = await issueValues(ctx, { currency: "", total: 0, customer, withFx: false })
  const now = nowIso()
  return {
    status: "sent",
    // Keep the original sent_at; a resend only stamps resent_at.
    sentAt: previousSentAt ?? now,
    resentAt: previousSentAt ? now : null,
    sentVia: channel,
    fromDetails,
    customerDetails,
  }
}

export type SaveQuoteResult = { quote: QuoteRow; email?: FollowUp }

export async function createQuote(ctx: ServiceCtx, input: SaveQuoteInput): Promise<SaveQuoteResult> {
  const customer = await getCustomer(ctx, input.customer_id)
  const values = await documentValues(ctx, input, customer)
  const quoteNumber = input.quote_number ?? (await nextQuoteNumber(ctx))
  const send = input.action === "send" ? await sentValues(ctx, customer, "email", null) : { status: "draft" }

  const [created] = await rethrow(
    ctx.db
      .insert(quotes)
      .values(withOrg(ctx.orgId, { ...values, ...send, userId: ctx.userId, quoteNumber, internalNote: null }))
      .returning(),
  )
  return { quote: created!, ...(await afterSave(ctx, created!.id, input)) }
}

/**
 * Edit a draft or declined quote. Saving a declined quote puts it back to
 * draft (the edit page did this) so it can be reviewed and resent; `send`
 * issues it in the same step.
 */
export async function updateQuote(ctx: ServiceCtx, id: string, input: SaveQuoteInput): Promise<SaveQuoteResult> {
  const existing = await getQuoteRow(ctx, id)
  if (!isQuoteEditable(existing.status)) {
    throw new ServiceError(409, "INVALID_STATE", `This quote is ${existing.status}; only drafts and declined quotes can be edited.`)
  }
  const customer = await getCustomer(ctx, input.customer_id)
  const values = await documentValues(ctx, input, customer)
  const quoteNumber = input.quote_number ?? existing.quoteNumber ?? (await nextQuoteNumber(ctx))
  const send = input.action === "send" ? await sentValues(ctx, customer, "email", existing.sentAt) : { status: "draft" }

  const [updated] = await rethrow(
    ctx.db
      .update(quotes)
      .set({ ...values, ...send, quoteNumber, updatedAt: nowIso() })
      // Re-check the status in the write itself: never overwrite a quote that
      // was sent (or accepted) between loading it and saving.
      .where(inOrg(quotes, ctx.orgId, eq(quotes.id, id), inArray(quotes.status, ["draft", "declined"])))
      .returning(),
  )
  if (!updated) throw new ServiceError(409, "INVALID_STATE", "This quote changed; reload and try again.")
  return { quote: updated, ...(await afterSave(ctx, id, input)) }
}

async function afterSave(ctx: ServiceCtx, id: string, input: SaveQuoteInput) {
  return input.action === "send" ? { email: await followUp(() => ctx.effects.sendQuoteEmail(id)) } : {}
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

/**
 * Issue a draft or declined quote through any channel (detail page "Send"):
 * status sent, sent stamps and snapshots. Emails it when the channel is email.
 */
export async function issueQuote(ctx: ServiceCtx, id: string, channel: SendChannel) {
  const quote = await getQuoteRow(ctx, id)
  if (!isQuoteSendable(quote.status)) throw new ServiceError(409, "INVALID_STATE", `This quote was already ${quote.status}.`)
  const customer = await getCustomer(ctx, quote.customerId)
  const send = await sentValues(ctx, customer, channel, quote.sentAt)

  const [updated] = await ctx.db
    .update(quotes)
    .set({ ...send, updatedAt: nowIso() })
    .where(inOrg(quotes, ctx.orgId, eq(quotes.id, id), eq(quotes.status, quote.status)))
    .returning()
  if (!updated) throw new ServiceError(409, "INVALID_STATE", "This quote changed; reload and try again.")
  const email = channel === "email" ? await followUp(() => ctx.effects.sendQuoteEmail(id)) : undefined
  return { quote: updated, ...(email ? { email } : {}) }
}

/** Resend the email for a quote that has already been issued. */
export async function resendQuoteEmail(ctx: ServiceCtx, id: string) {
  const quote = await getQuoteRow(ctx, id)
  if (quote.status === "draft") throw new ServiceError(409, "INVALID_STATE", "Send the quote first.")
  // Unlike a send, a failed retry is the user's direct request: surface it.
  try {
    return await ctx.effects.sendQuoteEmail(id)
  } catch (error) {
    throw new ServiceError(502, "INTERNAL", "The email couldn't be sent. Please try again.", undefined, error)
  }
}

/** A fresh draft copy with the next number (detail page "Duplicate"). */
export async function duplicateQuote(ctx: ServiceCtx, id: string) {
  const source = await getQuoteRow(ctx, id)
  const quoteNumber = await nextQuoteNumber(ctx)
  const [copy] = await rethrow(
    ctx.db
      .insert(quotes)
      .values(
        withOrg(ctx.orgId, {
          userId: ctx.userId,
          customerId: source.customerId,
          customerName: source.customerName,
          quoteNumber,
          status: "draft",
          currency: source.currency,
          issueDate: source.issueDate,
          validUntil: source.validUntil,
          lineItems: source.lineItems,
          subtotal: source.subtotal,
          taxAmount: source.taxAmount,
          discount: source.discount,
          vatRate: source.vatRate,
          discountPercent: source.discountPercent,
          total: source.total,
          exchangeRate: source.exchangeRate,
          convertedAmount: source.convertedAmount,
          baseCurrency: source.baseCurrency,
          note: source.note,
          internalNote: source.internalNote,
          customFields: source.customFields ?? [],
          quoteTemplate: source.quoteTemplate,
          includePdf: source.includePdf,
        }),
      )
      .returning(),
  )
  return { quote: copy! }
}

/** Permanently delete. An invoice made from it keeps existing (quote_id is set null). */
export async function deleteQuote(ctx: ServiceCtx, id: string) {
  const quote = await getQuoteRow(ctx, id)
  await rethrow(ctx.db.delete(quotes).where(inOrg(quotes, ctx.orgId, eq(quotes.id, id))))
  return { quote }
}

export async function updateQuoteMeta(ctx: ServiceCtx, id: string, meta: { internal_note: string }) {
  const [updated] = await ctx.db
    .update(quotes)
    .set({ internalNote: meta.internal_note || null, updatedAt: nowIso() })
    .where(inOrg(quotes, ctx.orgId, eq(quotes.id, id)))
    .returning()
  if (!updated) throw new ServiceError(404, "NOT_FOUND", "Quote not found.")
  return { quote: updated }
}

// ─── Accept / decline / convert ─────────────────────────────────────────────

/** Inserts the draft invoice for an accepted quote (caller holds the quote's row lock). */
async function insertInvoiceFromQuote(tx: DbOrTx, ctx: ServiceCtx, quote: QuoteRow) {
  const template = await getDefaultTemplate({ db: tx, orgId: ctx.orgId })
  const draft = invoiceFromQuote(
    {
      customer_id: quote.customerId,
      customer_name: quote.customerName,
      currency: quote.currency,
      line_items: quote.lineItems,
      custom_fields: quote.customFields,
      subtotal: quote.subtotal,
      tax_amount: quote.taxAmount,
      discount: quote.discount,
      vat_rate: quote.vatRate,
      discount_percent: quote.discountPercent,
      total: quote.total,
      from_details: quote.fromDetails,
      customer_details: quote.customerDetails,
      note: quote.note,
    },
    template
      ? {
          payment_terms: template.paymentTerms,
          default_note: template.defaultNote,
          default_payment_details: template.defaultPaymentDetails,
          invoice_template: template.invoiceTemplate,
        }
      : null,
    ctx.today,
  )
  const invoiceNumber = await nextInvoiceNumber({ db: tx, orgId: ctx.orgId })
  const [invoice] = await tx
    .insert(invoices)
    .values(
      withOrg(ctx.orgId, {
        userId: ctx.userId,
        quoteId: quote.id,
        invoiceNumber,
        customerId: draft.customer_id,
        customerName: draft.customer_name,
        status: draft.status,
        issueDate: draft.issue_date,
        dueDate: draft.due_date,
        currency: draft.currency,
        lineItems: draft.line_items,
        customFields: draft.custom_fields,
        invoiceTemplate: draft.invoice_template,
        subtotal: draft.subtotal == null ? "0" : String(draft.subtotal),
        taxAmount: draft.tax_amount == null ? "0" : String(draft.tax_amount),
        discount: draft.discount == null ? "0" : String(draft.discount),
        vatRate: draft.vat_rate == null ? null : String(draft.vat_rate),
        discountPercent: draft.discount_percent == null ? null : String(draft.discount_percent),
        total: draft.total == null ? "0" : String(draft.total),
        fromDetails: draft.from_details ?? null,
        customerDetails: draft.customer_details ?? null,
        note: draft.note ?? "",
        paymentDetails: draft.payment_details ?? "",
      }),
    )
    .returning({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, status: invoices.status })
  return invoice!
}

/** Locks the quote row for the rest of the transaction (serialises conversions). */
async function lockQuote(tx: DbOrTx, ctx: ServiceCtx, id: string) {
  const [row] = await tx.select().from(quotes).where(inOrg(quotes, ctx.orgId, eq(quotes.id, id))).for("update")
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Quote not found.")
  return row
}

/**
 * The customer accepted outside the public link (phone, WhatsApp, in person):
 * mark the quote accepted and create its draft invoice, in one transaction —
 * what accept-quote does for the customer's own click, minus the "quote
 * accepted" email to the owner (who is the one doing this).
 */
export async function acceptQuote(ctx: ServiceCtx, id: string) {
  const quote = await getQuoteRow(ctx, id)
  if (quote.status !== "sent") {
    throw new ServiceError(409, "INVALID_STATE", `Only sent quotes can be accepted; this one is ${quote.status}.`)
  }
  if (isPastValidUntil(quote.validUntil, ctx.today)) {
    throw new ServiceError(409, "INVALID_STATE", `This quote expired on ${quote.validUntil}. Extend it or send a new one first.`)
  }
  return rethrow(
    ctx.db.transaction(async (tx) => {
      const locked = await lockQuote(tx, ctx, id)
      if (locked.status !== "sent") throw new ServiceError(409, "INVALID_STATE", "This quote changed; reload and try again.")
      const [accepted] = await tx
        .update(quotes)
        .set({ status: "accepted", acceptedAt: nowIso(), updatedAt: nowIso() })
        .where(inOrg(quotes, ctx.orgId, eq(quotes.id, id)))
        .returning()
      const invoice = await insertInvoiceFromQuote(tx, ctx, accepted!)
      return { quote: accepted!, invoice }
    }),
  )
}

/** The customer said no outside the public link. */
export async function declineQuote(ctx: ServiceCtx, id: string, reason: string | null) {
  const [updated] = await ctx.db
    .update(quotes)
    .set({ status: "declined", declinedAt: nowIso(), declineReason: reason || null, updatedAt: nowIso() })
    .where(inOrg(quotes, ctx.orgId, eq(quotes.id, id), eq(quotes.status, "sent")))
    .returning()
  if (!updated) {
    const quote = await getQuoteRow(ctx, id)
    throw new ServiceError(409, "INVALID_STATE", `Only sent quotes can be declined; this one is ${quote.status}.`)
  }
  return { quote: updated }
}

/**
 * The draft invoice for an accepted quote. Returns the existing one when it
 * was already made (by accept-quote or an earlier call), so this is safe to
 * repeat — it also repairs a quote whose invoice step failed.
 */
export async function convertQuoteToInvoice(ctx: ServiceCtx, id: string) {
  return rethrow(
    ctx.db.transaction(async (tx) => {
      const quote = await lockQuote(tx, ctx, id)
      if (quote.status !== "accepted") {
        throw new ServiceError(409, "INVALID_STATE", `Only accepted quotes become invoices; this one is ${quote.status}.`)
      }
      const existing = await linkedInvoice({ db: tx, orgId: ctx.orgId }, id)
      if (existing) return { quote, invoice: existing, created: false }
      return { quote, invoice: await insertInvoiceFromQuote(tx, ctx, quote), created: true }
    }),
  )
}

// ─── Bound to one caller ────────────────────────────────────────────────────

/** The quote services with the caller's context applied (McpContext.quotes). */
export function quoteServices(ctx: ServiceCtx) {
  return {
    get: (id: string) => getQuoteRow(ctx, id),
    create: (input: SaveQuoteInput) => createQuote(ctx, input),
    update: (id: string, input: SaveQuoteInput) => updateQuote(ctx, id, input),
    issue: (id: string, channel: SendChannel) => issueQuote(ctx, id, channel),
    duplicate: (id: string) => duplicateQuote(ctx, id),
    accept: (id: string) => acceptQuote(ctx, id),
    decline: (id: string, reason: string | null) => declineQuote(ctx, id, reason),
    convert: (id: string) => convertQuoteToInvoice(ctx, id),
    remove: (id: string) => deleteQuote(ctx, id),
  }
}

export type QuoteServices = ReturnType<typeof quoteServices>
