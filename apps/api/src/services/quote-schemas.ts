import { z } from "zod"
import { customFieldSchema, discountSchema, lineItemSchema, SEND_CHANNELS } from "./invoice-schemas.js"

// Inputs for quote operations, shared by the /v1 routes (the app) and the
// assistant's tools. Same line-item, discount and custom-field shapes as
// invoices, so the document editor and the totals maths are shared.

/** Per-quote settings (the quote settings sheet). */
export const quoteSettingsSchema = z.object({
  include_pdf: z.boolean(),
  quote_template: z.string().max(50),
})

/** The document itself — what the create and edit pages collect. */
export const quoteFieldsSchema = z.object({
  customer_id: z.uuid(),
  /** Omit to take the next number in sequence. */
  quote_number: z.string().trim().min(1).max(50).optional(),
  currency: z.string().length(3).toUpperCase(),
  issue_date: z.iso.date().nullable().default(null),
  /**
   * null = no expiry. Omit to use the quote template's validity period from
   * the issue date (the create page fills this in the same way).
   */
  valid_until: z.iso.date().nullable().optional(),
  line_items: z.array(lineItemSchema).max(200),
  discount: discountSchema.nullable().default(null),
  vat_rate: z.number().min(0).max(100).nullable().default(null),
  note: z.string().max(5000).default(""),
  custom_fields: z.array(customFieldSchema).max(8).default([]),
  /** Omit to use the organisation's quote template defaults. */
  settings: quoteSettingsSchema.optional(),
})

export const saveQuoteSchema = quoteFieldsSchema.extend({
  /** draft = save only; send = issue and email now. */
  action: z.enum(["draft", "send"]),
})

export const issueQuoteSchema = z.object({ channel: z.enum(SEND_CHANNELS) })

export const quoteMetaSchema = z.object({ internal_note: z.string().max(10_000) })

export const declineQuoteSchema = z.object({ reason: z.string().trim().max(1000).nullable().default(null) })

export type SaveQuoteInput = z.infer<typeof saveQuoteSchema>
