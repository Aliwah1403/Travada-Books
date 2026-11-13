import { z } from "zod"

// Inputs for invoice and payment operations. Shared by the /v1 routes (the
// app) and the assistant's tools, so both are validated the same way.
// Field names are snake_case to match the database and the app's types.

export const lineItemSchema = z.object({
  description: z.string().max(2000),
  quantity: z.number().min(0).max(1_000_000_000),
  price: z.number().min(-1_000_000_000_000).max(1_000_000_000_000),
  tax_rate: z.number().min(0).max(100).default(0),
})

export const discountSchema = z.object({
  type: z.enum(["%", "fixed"]),
  value: z.number().min(0),
})

export const partialPaymentRulesSchema = z.object({
  enabled: z.boolean(),
  min_percent: z.number().nullable(),
  min_amount: z.number().nullable(),
  deposit_percent: z.number().nullable(),
  deadline_days: z.number().nullable(),
  max_payments: z.number().nullable(),
})

/** Per-invoice display and payment settings (the invoice settings sheet). */
export const invoiceSettingsSchema = z.object({
  accept_payments: z.boolean(),
  partial_payments: partialPaymentRulesSchema.nullable(),
  include_pdf: z.boolean(),
  invoice_template: z.string().max(50),
  date_format: z.string().max(30).nullable(),
  show_tax_column: z.boolean().nullable(),
  show_qty_column: z.boolean().nullable(),
})

export const recurringSchema = z.object({
  frequency: z.enum(["one_time", "weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  end_type: z.enum(["never", "on_date", "after_count"]).default("never"),
  end_on_date: z.iso.date().nullable().default(null),
  end_after_count: z.number().int().min(1).max(1000).nullable().default(null),
})

export const customFieldSchema = z.object({
  id: z.string().max(100),
  label: z.string().max(200),
  value: z.string().max(2000),
})

/** The document itself — what the create and edit pages collect. */
export const invoiceFieldsSchema = z.object({
  customer_id: z.uuid(),
  /** Omit to take the next number in sequence. */
  invoice_number: z.string().trim().min(1).max(50).optional(),
  currency: z.string().length(3).toUpperCase(),
  issue_date: z.iso.date().nullable().default(null),
  due_date: z.iso.date().nullable().default(null),
  line_items: z.array(lineItemSchema).max(200),
  discount: discountSchema.nullable().default(null),
  vat_rate: z.number().min(0).max(100).nullable().default(null),
  payment_details: z.string().max(5000).default(""),
  note: z.string().max(5000).default(""),
  custom_fields: z.array(customFieldSchema).max(20).default([]),
  /** Omit to use the organisation's invoice template defaults. */
  settings: invoiceSettingsSchema.optional(),
  recurring: recurringSchema.default({ frequency: "one_time", end_type: "never", end_on_date: null, end_after_count: null }),
})

export const saveActionSchema = z.object({
  /** draft = save only; send = issue and email now; schedule = email at schedule_at. */
  action: z.enum(["draft", "send", "schedule"]),
  schedule_at: z.iso.datetime({ offset: true }).optional(),
})

export const saveInvoiceSchema = invoiceFieldsSchema.extend(saveActionSchema.shape).refine(
  (v) => v.action !== "schedule" || (v.schedule_at && new Date(v.schedule_at) > new Date()),
  { message: "schedule_at must be in the future", path: ["schedule_at"] },
)

export const SEND_CHANNELS = ["email", "whatsapp", "link", "pdf", "manual"] as const
export const issueInvoiceSchema = z.object({ channel: z.enum(SEND_CHANNELS) })

export const invoiceMetaSchema = z
  .object({
    internal_note: z.string().max(10_000).optional(),
    skip_auto_reminder: z.boolean().optional(),
  })
  .refine((v) => v.internal_note !== undefined || v.skip_auto_reminder !== undefined, { message: "Nothing to update" })

export const recurringStatusSchema = z.object({ status: z.enum(["active", "paused", "canceled"]) })

export const PAYMENT_METHODS = ["mpesa", "bank_transfer", "cash", "card", "cheque", "other"] as const
export const recordPaymentSchema = z.object({
  invoice_id: z.uuid(),
  amount: z.number().positive().max(1_000_000_000_000),
  paid_at: z.iso.datetime({ offset: true }).optional(),
  method: z.enum(PAYMENT_METHODS).default("mpesa"),
  reference: z.string().trim().max(100).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
})

export type InvoiceFields = z.infer<typeof invoiceFieldsSchema>
export type SaveInvoiceInput = z.infer<typeof saveInvoiceSchema>
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>
export type SendChannel = (typeof SEND_CHANNELS)[number]
