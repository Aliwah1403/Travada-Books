import {
  addFrequency,
  buildCustomerDetailsSnapshot,
  buildFromDetailsSnapshot,
  canRecordPayment,
  computeStoredTotals,
  type InvoiceRecurringFrequency,
  isInvoiceCancelable,
  isInvoiceEditable,
  normalizeCustomFields,
  normalizePartialRules,
  reopenInvoiceStatus,
  resolveDocumentLogo,
  toRateColumns,
} from "@travada-books/core"
import { and, desc, eq, sql } from "drizzle-orm"
import { type DbOrTx, inOrg, withOrg } from "../db/client.js"
import { customers, exchangeRates, invoicePayments, invoiceRecurring, invoices, invoiceTemplates, organizations } from "../db/schema.js"
import { mapDbError, ServiceError } from "../lib/errors.js"
import type { Effects } from "./effects.js"
import type { InvoiceFields, RecordPaymentInput, SaveInvoiceInput, SendChannel } from "./invoice-schemas.js"

// Every invoice and payment write, in one place (API-WRITES-PLAN.md §6,
// domain 1). The /v1 routes (the app) and the assistant's tools both call
// these, so an invoice is created, sent or paid the same way everywhere.
//
// Behaviour mirrors what the app did in the browser before (create.tsx,
// edit.tsx, invoices/detail.tsx, invoice-actions.tsx, record-payment-dialog)
// — with the multi-step parts now in one transaction, and side effects
// (email, notifications, jobs) after commit.

export type ServiceCtx = {
  db: DbOrTx
  orgId: string
  userId: string
  /** Today, "YYYY-MM-DD", in the caller's timezone. */
  today: string
  effects: Effects
}

/** Outcome of a follow-up step that ran after the write committed. */
export type FollowUp = { ok: true; queued?: boolean } | { ok: false; error: string }

const NUMBER_TAKEN = {
  invoices_invoice_number_customer_id_key: {
    code: "INVOICE_NUMBER_TAKEN" as const,
    message: "That invoice number is already used for this customer. Use a different number, or leave it blank to auto-generate one.",
    field: "invoice_number",
  },
}

const num = (value: number) => String(Math.round(value * 100) / 100)
const nowIso = () => new Date().toISOString()

async function rethrow<T>(work: Promise<T>): Promise<T> {
  try {
    return await work
  } catch (error) {
    throw mapDbError(error, NUMBER_TAKEN)
  }
}

async function followUp(work: () => Promise<{ queued?: boolean } | void>): Promise<FollowUp> {
  try {
    const result = await work()
    return { ok: true, ...(result && "queued" in result ? { queued: result.queued } : {}) }
  } catch (error) {
    console.error("[invoices] follow-up failed:", error)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// ─── Loading ──────────────────────────────────────────────────────────────

export async function getInvoiceRow(ctx: Pick<ServiceCtx, "db" | "orgId">, id: string) {
  const [row] = await ctx.db.select().from(invoices).where(inOrg(invoices, ctx.orgId, eq(invoices.id, id))).limit(1)
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Invoice not found.")
  return row
}

async function getCustomer(ctx: Pick<ServiceCtx, "db" | "orgId">, id: string) {
  const [row] = await ctx.db.select().from(customers).where(inOrg(customers, ctx.orgId, eq(customers.id, id))).limit(1)
  if (!row) throw new ServiceError(422, "VALIDATION_FAILED", "Customer not found.", "customer_id")
  return row
}

async function getDefaultTemplate(ctx: Pick<ServiceCtx, "db" | "orgId">) {
  const [row] = await ctx.db
    .select()
    .from(invoiceTemplates)
    .where(inOrg(invoiceTemplates, ctx.orgId, eq(invoiceTemplates.isDefault, true)))
    .limit(1)
  return row ?? null
}

async function getOrg(ctx: Pick<ServiceCtx, "db" | "orgId">) {
  // organizations is keyed by id (no org_id column); ctx.orgId is the caller's
  // verified active org.
  const [row] = await ctx.db.select().from(organizations).where(eq(organizations.id, ctx.orgId)).limit(1)
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Organisation not found.")
  return row
}

async function nextInvoiceNumber(ctx: Pick<ServiceCtx, "db" | "orgId">): Promise<string> {
  const rows = await ctx.db.execute<{ n: string }>(sql`select public.next_invoice_number(${ctx.orgId}::uuid) as n`)
  const n = rows[0]?.n
  if (!n) throw new Error("next_invoice_number returned nothing")
  return n
}

async function lookupRate(ctx: Pick<ServiceCtx, "db">, base: string, target: string): Promise<number | null> {
  if (base === target) return 1
  const [row] = await ctx.db
    .select({ rate: exchangeRates.rate })
    .from(exchangeRates)
    .where(and(eq(exchangeRates.base, base), eq(exchangeRates.target, target)))
    .limit(1)
  return row ? Number(row.rate) : null
}

// ─── Snapshots (CLAUDE.md "JSONB snapshot pattern") ─────────────────────────

type OrgRow = Awaited<ReturnType<typeof getOrg>>
type CustomerRow = Awaited<ReturnType<typeof getCustomer>>

function fromSnapshot(org: OrgRow, templateLogo: string | null | undefined) {
  return buildFromDetailsSnapshot(
    {
      name: org.name,
      address_line1: org.addressLine1,
      address_line2: org.addressLine2,
      city: org.city,
      zip: org.zip,
      country_code: org.countryCode,
      phone: org.phone,
      email: org.email,
      tax_id: org.taxId,
      tax_id_label: org.taxIdLabel,
    },
    resolveDocumentLogo(templateLogo, { logo_url: org.logoUrl }),
  )
}

function customerSnapshot(customer: CustomerRow) {
  return buildCustomerDetailsSnapshot({
    name: customer.name,
    email: customer.email,
    billing_email: customer.billingEmail,
    billing_cc: customer.billingCc,
    phone: customer.phone,
    address_line1: customer.addressLine1,
    address_line2: customer.addressLine2,
    city: customer.city,
    zip: customer.zip,
    country: customer.country,
  })
}

/** Issue-time values: FX against the base currency and both snapshots. */
async function issueValues(ctx: ServiceCtx, opts: { currency: string; total: number; customer: CustomerRow; withFx: boolean }) {
  const [org, template] = await Promise.all([getOrg(ctx), getDefaultTemplate(ctx)])
  let fx: Record<string, unknown> = {}
  if (opts.withFx) {
    const rate = await lookupRate(ctx, opts.currency, org.baseCurrency)
    fx = {
      exchangeRate: rate == null ? null : String(rate),
      convertedAmount: rate == null ? null : num(opts.total * rate),
      baseCurrency: org.baseCurrency,
    }
  }
  return {
    ...fx,
    fromDetails: fromSnapshot(org, template?.logoUrl),
    customerDetails: customerSnapshot(opts.customer),
  }
}

// ─── Create / edit ──────────────────────────────────────────────────────────

async function resolveSettings(ctx: ServiceCtx, fields: InvoiceFields) {
  if (fields.settings) return fields.settings
  // Same defaults the settings sheet starts from (defaultInvoiceSettings).
  const t = await getDefaultTemplate(ctx)
  return {
    accept_payments: t?.acceptPayments ?? false,
    partial_payments: normalizePartialRules(t?.partialPayments),
    include_pdf: t?.includePdf ?? true,
    invoice_template: t?.invoiceTemplate ?? "classic",
    date_format: t?.dateFormat ?? "DD/MM/YYYY",
    show_tax_column: t?.includeTax ?? false,
    show_qty_column: t?.showQtyColumn ?? true,
  }
}

/** The document columns both create and edit write. */
async function documentValues(ctx: ServiceCtx, input: SaveInvoiceInput, customer: CustomerRow) {
  const totals = computeStoredTotals(input.line_items, input.discount, input.vat_rate)
  const rates = toRateColumns(
    input.discount?.type ?? "%",
    input.discount ? String(input.discount.value) : "",
    input.vat_rate == null ? "" : String(input.vat_rate),
  )
  const settings = await resolveSettings(ctx, input)
  const isSend = input.action === "send"
  const isSchedule = input.action === "schedule"

  return {
    totals,
    values: {
      customerId: customer.id,
      customerName: customer.name,
      status: isSend ? "unpaid" : isSchedule ? "scheduled" : "draft",
      currency: input.currency,
      issueDate: input.issue_date,
      dueDate: input.due_date,
      recurring: input.recurring.frequency,
      lineItems: input.line_items,
      subtotal: num(totals.subtotal),
      taxAmount: num(totals.tax_amount),
      discount: num(totals.discount),
      vatRate: rates.vat_rate == null ? null : String(rates.vat_rate),
      discountPercent: rates.discount_percent == null ? null : String(rates.discount_percent),
      total: num(totals.total),
      paymentDetails: input.payment_details,
      note: input.note,
      deliveryType: input.action === "draft" ? "none" : "email",
      scheduledAt: isSchedule ? (input.schedule_at ?? null) : null,
      sendTemplateId: null,
      acceptPayments: settings.accept_payments,
      partialPayments: settings.partial_payments,
      includePdf: settings.include_pdf,
      invoiceTemplate: settings.invoice_template,
      dateFormat: settings.date_format,
      showTaxColumn: settings.show_tax_column,
      showQtyColumn: settings.show_qty_column,
      customFields: normalizeCustomFields(input.custom_fields),
      ...(isSend ? { sentAt: nowIso(), sentVia: "email" } : {}),
      ...(isSend || isSchedule ? await issueValues(ctx, { currency: input.currency, total: totals.total, customer, withFx: isSend }) : {}),
    },
  }
}

type InvoiceRow = Awaited<ReturnType<typeof getInvoiceRow>>

/** Starts a recurring series from a just-saved invoice and links it (sequence 1). */
async function startSeries(tx: DbOrTx, ctx: ServiceCtx, invoice: InvoiceRow, recurring: SaveInvoiceInput["recurring"]) {
  const frequency = recurring.frequency as InvoiceRecurringFrequency
  const next = addFrequency(invoice.issueDate!, frequency)
  const [series] = await tx
    .insert(invoiceRecurring)
    .values(
      withOrg(ctx.orgId, {
        userId: ctx.userId,
        customerId: invoice.customerId!,
        customerName: invoice.customerName ?? "",
        currency: invoice.currency,
        lineItems: invoice.lineItems,
        subtotal: invoice.subtotal ?? "0",
        taxAmount: invoice.taxAmount ?? "0",
        discount: invoice.discount ?? "0",
        total: invoice.total ?? "0",
        paymentDetails: invoice.paymentDetails ?? "",
        note: invoice.note ?? "",
        // Nullable on invoices, NOT NULL with defaults on the series: a null
        // falls back to the column default, as the app's insert did.
        acceptPayments: invoice.acceptPayments ?? undefined,
        partialPayments: invoice.partialPayments,
        includePdf: invoice.includePdf ?? undefined,
        invoiceTemplate: invoice.invoiceTemplate ?? undefined,
        dateFormat: invoice.dateFormat,
        showTaxColumn: invoice.showTaxColumn,
        showQtyColumn: invoice.showQtyColumn,
        fromDetails: invoice.fromDetails ?? null,
        customerDetails: invoice.customerDetails ?? null,
        customFields: invoice.customFields ?? [],
        sourceIssueDate: invoice.issueDate!,
        sourceDueDate: invoice.dueDate ?? null,
        frequency,
        endType: recurring.end_type,
        endOnDate: recurring.end_type === "on_date" ? recurring.end_on_date : null,
        endAfterCount: recurring.end_type === "after_count" ? recurring.end_after_count : null,
        status: "active",
        nextScheduledAt: new Date(`${next}T00:00:00Z`).toISOString(),
      }),
    )
    .returning({ id: invoiceRecurring.id })
  await tx
    .update(invoices)
    .set({ invoiceRecurringId: series!.id, recurringSequence: 1 })
    .where(inOrg(invoices, ctx.orgId, eq(invoices.id, invoice.id)))
  return series!.id
}

export type SaveResult = { invoice: InvoiceRow; email?: FollowUp; schedule?: FollowUp }

/**
 * Create an invoice: save as draft, send now, or schedule. Recurring
 * invoices start their series in the same transaction — previously four
 * separate browser requests that could stop halfway.
 */
export async function createInvoice(ctx: ServiceCtx, input: SaveInvoiceInput): Promise<SaveResult> {
  const customer = await getCustomer(ctx, input.customer_id)
  const { values } = await documentValues(ctx, input, customer)
  const invoiceNumber = input.invoice_number ?? (await nextInvoiceNumber(ctx))

  const invoice = await rethrow(
    ctx.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(invoices)
        .values(withOrg(ctx.orgId, { ...values, userId: ctx.userId, invoiceNumber }))
        .returning()
      // create.tsx started a series for any action once an issue date is set.
      if (input.recurring.frequency !== "one_time" && created!.issueDate) {
        await startSeries(tx, ctx, created!, input.recurring)
      }
      return created!
    }),
  )
  return { invoice: await getInvoiceRow(ctx, invoice.id), ...(await afterSave(ctx, invoice.id, input)) }
}

/** Edit a draft, optionally sending or scheduling it in the same step. */
export async function updateInvoice(ctx: ServiceCtx, id: string, input: SaveInvoiceInput): Promise<SaveResult> {
  const existing = await getInvoiceRow(ctx, id)
  if (!isInvoiceEditable(existing.status)) {
    throw new ServiceError(409, "INVALID_STATE", `This invoice is ${existing.status}; only drafts can be edited.`)
  }
  const customer = await getCustomer(ctx, input.customer_id)
  const { values } = await documentValues(ctx, input, customer)
  const invoiceNumber = input.invoice_number ?? existing.invoiceNumber ?? (await nextInvoiceNumber(ctx))

  await rethrow(
    ctx.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(invoices)
        .set({ ...values, invoiceNumber, updatedAt: nowIso() })
        // Re-check the status in the write itself: never overwrite an invoice
        // that was sent between loading it and saving.
        .where(inOrg(invoices, ctx.orgId, eq(invoices.id, id), eq(invoices.status, "draft")))
        .returning()
      if (!updated) throw new ServiceError(409, "INVALID_STATE", "This invoice is no longer a draft.")
      // edit.tsx: only when sending/scheduling, and never a second series.
      if (
        (input.action === "send" || input.action === "schedule") &&
        input.recurring.frequency !== "one_time" &&
        updated.issueDate &&
        !existing.invoiceRecurringId
      ) {
        await startSeries(tx, ctx, updated, input.recurring)
      }
    }),
  )
  return { invoice: await getInvoiceRow(ctx, id), ...(await afterSave(ctx, id, input)) }
}

async function afterSave(ctx: ServiceCtx, id: string, input: SaveInvoiceInput) {
  if (input.action === "send") return { email: await followUp(() => ctx.effects.sendInvoiceEmail(id)) }
  if (input.action === "schedule" && input.schedule_at) {
    const scheduledAt = input.schedule_at
    return { schedule: await followUp(() => ctx.effects.scheduleInvoiceSend(id, scheduledAt)) }
  }
  return {}
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

/**
 * Issue a draft through any channel (detail page "Send"): status unpaid,
 * sent_at/sent_via, FX and snapshots. Emails it when the channel is email.
 */
export async function issueInvoice(ctx: ServiceCtx, id: string, channel: SendChannel) {
  const invoice = await getInvoiceRow(ctx, id)
  if (invoice.status !== "draft") throw new ServiceError(409, "INVALID_STATE", `This invoice was already ${invoice.status}.`)
  if (!invoice.customerId) throw new ServiceError(422, "VALIDATION_FAILED", "Add a customer before sending.", "customer_id")
  const customer = await getCustomer(ctx, invoice.customerId)
  const issue = await issueValues(ctx, { currency: invoice.currency, total: Number(invoice.total ?? 0), customer, withFx: true })

  const [updated] = await ctx.db
    .update(invoices)
    .set({ status: "unpaid", sentAt: nowIso(), sentVia: channel, ...issue, updatedAt: nowIso() })
    .where(inOrg(invoices, ctx.orgId, eq(invoices.id, id), eq(invoices.status, "draft")))
    .returning()
  if (!updated) throw new ServiceError(409, "INVALID_STATE", "This invoice is no longer a draft.")
  const email = channel === "email" ? await followUp(() => ctx.effects.sendInvoiceEmail(id)) : undefined
  return { invoice: updated, ...(email ? { email } : {}) }
}

/** Resend the email for an invoice that has already been issued. */
export async function resendInvoiceEmail(ctx: ServiceCtx, id: string) {
  const invoice = await getInvoiceRow(ctx, id)
  if (invoice.status === "draft" || invoice.status === "scheduled") {
    throw new ServiceError(409, "INVALID_STATE", "Send the invoice first.")
  }
  // Unlike a send, a failed retry is the user's direct request: surface it.
  try {
    return await ctx.effects.sendInvoiceEmail(id)
  } catch (error) {
    throw new ServiceError(502, "INTERNAL", "The email couldn't be sent. Please try again.", undefined, error)
  }
}

export async function sendReminder(ctx: ServiceCtx, id: string) {
  const invoice = await getInvoiceRow(ctx, id)
  if (!["unpaid", "overdue", "partially_paid"].includes(invoice.status)) {
    throw new ServiceError(409, "INVALID_STATE", `Reminders are for unpaid invoices; this one is ${invoice.status}.`)
  }
  try {
    await ctx.effects.sendInvoiceReminder(id)
  } catch (error) {
    throw new ServiceError(502, "INTERNAL", "The reminder couldn't be sent. Please try again.", undefined, error)
  }
  return { invoice }
}

/** A fresh draft copy with the next number (detail page "Duplicate"). */
export async function duplicateInvoice(ctx: ServiceCtx, id: string) {
  const source = await getInvoiceRow(ctx, id)
  const invoiceNumber = await nextInvoiceNumber(ctx)
  const [copy] = await rethrow(
    ctx.db
      .insert(invoices)
      .values(
        withOrg(ctx.orgId, {
          userId: ctx.userId,
          customerId: source.customerId,
          customerName: source.customerName,
          invoiceNumber,
          status: "draft",
          currency: source.currency,
          issueDate: null,
          dueDate: null,
          recurring: "one_time",
          lineItems: source.lineItems,
          subtotal: source.subtotal ?? "0",
          taxAmount: source.taxAmount ?? "0",
          discount: source.discount ?? "0",
          vatRate: source.vatRate,
          discountPercent: source.discountPercent,
          total: source.total ?? "0",
          paymentDetails: source.paymentDetails ?? "",
          note: source.note ?? "",
          deliveryType: "none",
          scheduledAt: null,
          sendTemplateId: null,
          acceptPayments: source.acceptPayments,
          partialPayments: source.partialPayments,
          customFields: source.customFields ?? [],
          // The list menu kept the template and the detail page didn't; a copy
          // should look like its source, so keep it. Recurring is reset: a
          // draft copy isn't part of any series.
          invoiceTemplate: source.invoiceTemplate,
        }),
      )
      .returning(),
  )
  return { invoice: copy! }
}

/**
 * "Cancel schedule": back to a draft. The queued Trigger.dev job still fires
 * at the scheduled time, but scheduled-send only sends invoices that are
 * still scheduled (as before).
 */
export async function unscheduleInvoice(ctx: ServiceCtx, id: string) {
  const [updated] = await ctx.db
    .update(invoices)
    .set({ status: "draft", scheduledAt: null, updatedAt: nowIso() })
    .where(inOrg(invoices, ctx.orgId, eq(invoices.id, id), eq(invoices.status, "scheduled")))
    .returning()
  if (!updated) throw new ServiceError(409, "INVALID_STATE", "This invoice isn't scheduled.")
  return { invoice: updated }
}

export async function cancelInvoice(ctx: ServiceCtx, id: string) {
  const invoice = await getInvoiceRow(ctx, id)
  if (!isInvoiceCancelable(invoice.status, Number(invoice.amountPaid))) {
    throw new ServiceError(
      409,
      "INVALID_STATE",
      Number(invoice.amountPaid) > 0
        ? "Remove the recorded payments before canceling."
        : `A ${invoice.status} invoice can't be canceled.`,
    )
  }
  const [updated] = await ctx.db
    .update(invoices)
    .set({ status: "canceled", updatedAt: nowIso() })
    .where(inOrg(invoices, ctx.orgId, eq(invoices.id, id), eq(invoices.status, invoice.status)))
    .returning()
  if (!updated) throw new ServiceError(409, "INVALID_STATE", "The invoice changed; reload and try again.")
  return { invoice: updated }
}

export async function reopenInvoice(ctx: ServiceCtx, id: string) {
  const invoice = await getInvoiceRow(ctx, id)
  if (invoice.status !== "canceled") throw new ServiceError(409, "INVALID_STATE", "Only canceled invoices can be reopened.")
  const status = reopenInvoiceStatus({ due_date: invoice.dueDate, amount_paid: Number(invoice.amountPaid) }, ctx.today)
  const [updated] = await ctx.db
    .update(invoices)
    .set({ status, updatedAt: nowIso() })
    .where(inOrg(invoices, ctx.orgId, eq(invoices.id, id), eq(invoices.status, "canceled")))
    .returning()
  if (!updated) throw new ServiceError(409, "INVALID_STATE", "The invoice changed; reload and try again.")
  return { invoice: updated }
}

/** Permanently delete (the app allows any status; the assistant only drafts). */
export async function deleteInvoice(ctx: ServiceCtx, id: string) {
  const invoice = await getInvoiceRow(ctx, id)
  await rethrow(ctx.db.delete(invoices).where(inOrg(invoices, ctx.orgId, eq(invoices.id, id))))
  return { invoice }
}

export async function updateInvoiceMeta(ctx: ServiceCtx, id: string, meta: { internal_note?: string; skip_auto_reminder?: boolean }) {
  const [updated] = await ctx.db
    .update(invoices)
    .set({
      ...(meta.internal_note !== undefined ? { internalNote: meta.internal_note } : {}),
      ...(meta.skip_auto_reminder !== undefined ? { skipAutoReminder: meta.skip_auto_reminder } : {}),
      updatedAt: nowIso(),
    })
    .where(inOrg(invoices, ctx.orgId, eq(invoices.id, id)))
    .returning()
  if (!updated) throw new ServiceError(404, "NOT_FOUND", "Invoice not found.")
  return { invoice: updated }
}

export async function setRecurringStatus(ctx: ServiceCtx, seriesId: string, status: "active" | "paused" | "canceled") {
  const [updated] = await ctx.db
    .update(invoiceRecurring)
    .set({ status, updatedAt: nowIso() })
    .where(inOrg(invoiceRecurring, ctx.orgId, eq(invoiceRecurring.id, seriesId)))
    .returning({ id: invoiceRecurring.id, status: invoiceRecurring.status })
  if (!updated) throw new ServiceError(404, "NOT_FOUND", "Recurring series not found.")
  return { series: updated }
}

// ─── Payments ───────────────────────────────────────────────────────────────

/**
 * Record money received. The invoice's status and amount_paid are derived by
 * the invoice_payments_sync trigger; when that leaves it paid, the "invoice
 * paid" notification goes out (as the app did).
 */
export async function recordPayment(ctx: ServiceCtx, input: RecordPaymentInput) {
  const invoice = await getInvoiceRow(ctx, input.invoice_id)
  if (!canRecordPayment(invoice.status)) {
    throw new ServiceError(409, "INVALID_STATE", `Payments can't be recorded on a ${invoice.status} invoice.`)
  }
  const [payment] = await rethrow(
    ctx.db
      .insert(invoicePayments)
      .values(
        withOrg(ctx.orgId, {
          invoiceId: invoice.id,
          recordedBy: ctx.userId,
          amount: num(input.amount),
          currency: invoice.currency,
          paidAt: input.paid_at ?? nowIso(),
          method: input.method,
          reference: input.reference ?? null,
          note: input.note ?? null,
          source: "manual",
        }),
      )
      .returning(),
  )
  const after = await getInvoiceRow(ctx, invoice.id)
  const notify = after.status === "paid" ? await followUp(() => ctx.effects.notifyInvoicePaid(invoice.id)) : undefined
  return { payment: payment!, invoice: after, ...(notify ? { notify } : {}) }
}

/** "Mark as paid": a payment for the whole balance, method other. */
export async function markInvoicePaid(ctx: ServiceCtx, id: string) {
  const invoice = await getInvoiceRow(ctx, id)
  const balance = Number(invoice.total ?? 0) - Number(invoice.amountPaid ?? 0)
  if (balance <= 0) throw new ServiceError(409, "INVALID_STATE", "Nothing is owed on this invoice.")

  // Backfill snapshots if this invoice somehow got issued without them
  // (detail.tsx did this too) — public pages render from the snapshots.
  if ((!invoice.fromDetails || !invoice.customerDetails) && invoice.customerId) {
    const customer = await getCustomer(ctx, invoice.customerId)
    const issue = await issueValues(ctx, { currency: invoice.currency, total: 0, customer, withFx: false })
    await ctx.db
      .update(invoices)
      .set({
        ...(!invoice.fromDetails ? { fromDetails: issue.fromDetails } : {}),
        ...(!invoice.customerDetails ? { customerDetails: issue.customerDetails } : {}),
      })
      .where(inOrg(invoices, ctx.orgId, eq(invoices.id, id)))
  }
  return recordPayment(ctx, { invoice_id: id, amount: balance, method: "other" })
}

export async function deletePayment(ctx: ServiceCtx, paymentId: string) {
  const [deleted] = await ctx.db
    .delete(invoicePayments)
    .where(inOrg(invoicePayments, ctx.orgId, eq(invoicePayments.id, paymentId)))
    .returning({ id: invoicePayments.id, invoiceId: invoicePayments.invoiceId })
  if (!deleted) throw new ServiceError(404, "NOT_FOUND", "Payment not found.")
  return { payment: deleted, invoice: await getInvoiceRow(ctx, deleted.invoiceId) }
}

export async function listPayments(ctx: Pick<ServiceCtx, "db" | "orgId">, invoiceId: string) {
  return ctx.db
    .select()
    .from(invoicePayments)
    .where(inOrg(invoicePayments, ctx.orgId, eq(invoicePayments.invoiceId, invoiceId)))
    .orderBy(desc(invoicePayments.paidAt))
}

// ─── Bound to one caller ────────────────────────────────────────────────────

/**
 * The invoice services with the caller's context already applied. The
 * assistant's tools receive this (McpContext.invoices), which also lets tool
 * tests swap in fakes without a database.
 */
export function invoiceServices(ctx: ServiceCtx) {
  return {
    get: (id: string) => getInvoiceRow(ctx, id),
    create: (input: SaveInvoiceInput) => createInvoice(ctx, input),
    update: (id: string, input: SaveInvoiceInput) => updateInvoice(ctx, id, input),
    issue: (id: string, channel: SendChannel) => issueInvoice(ctx, id, channel),
    remind: (id: string) => sendReminder(ctx, id),
    duplicate: (id: string) => duplicateInvoice(ctx, id),
    cancel: (id: string) => cancelInvoice(ctx, id),
    remove: (id: string) => deleteInvoice(ctx, id),
    recordPayment: (input: RecordPaymentInput) => recordPayment(ctx, input),
    markPaid: (id: string) => markInvoicePaid(ctx, id),
  }
}

export type InvoiceServices = ReturnType<typeof invoiceServices>
