import { z } from "zod"

// The transaction sheet's fields (components/transactions/transaction-sheet.tsx)
// plus the list page's bulk actions. Values mirror the table's check constraints.

export const TRANSACTION_TYPES = ["income", "expense"] as const
export const TRANSACTION_STATUSES = ["pending", "completed", "excluded", "archived"] as const
export const PAYMENT_MODES = ["mpesa", "bank_transfer", "cash", "cheque", "card", "other"] as const
export const TAX_TYPES = ["vat", "wht", "other"] as const
export const FREQUENCIES = ["weekly", "biweekly", "monthly", "semi_monthly", "annually", "irregular"] as const

const optionalText = (max: number) => z.string().trim().max(max).nullable()

export const attachmentSchema = z.object({
  file_path: z.string().min(1).max(500),
  file_name: z.string().min(1).max(300),
  file_size: z.number().int().nonnegative().nullable().optional(),
  content_type: z.string().max(200).nullable().optional(),
})

export const transactionFieldsSchema = z.object({
  date: z.iso.date(),
  name: z.string().trim().min(1, "Name is required.").max(300),
  counterparty_name: optionalText(300),
  customer_id: z.uuid().nullable(),
  amount: z.number().positive("Amount must be more than 0."),
  currency: z.string().trim().length(3).toUpperCase(),
  type: z.enum(TRANSACTION_TYPES),
  status: z.enum(TRANSACTION_STATUSES),
  payment_mode: z.enum(PAYMENT_MODES).nullable(),
  category_id: z.uuid().nullable(),
  invoice_id: z.uuid().nullable(),
  tax_amount: z.number().nonnegative().nullable(),
  tax_rate: z.number().min(0).max(100).nullable(),
  tax_type: z.enum(TAX_TYPES).nullable(),
  recurring: z.boolean(),
  frequency: z.enum(FREQUENCIES).nullable(),
  internal: z.boolean(),
  reference_number: optionalText(200),
  note: optionalText(5000),
})

/** Create: date, name, amount, currency and type required; the rest default. */
export const createTransactionSchema = transactionFieldsSchema
  .partial()
  .required({ date: true, name: true, amount: true, currency: true, type: true })
  .extend({
    /** The app picks the id up front so attachments can be uploaded under it. */
    id: z.uuid().optional(),
    /** With invoice_id: record a payment for the invoice's balance (marks it paid). */
    mark_invoice_paid: z.boolean().default(false),
    attachments: z.array(attachmentSchema).max(20).default([]),
  })

/** Update: only the fields sent change. */
export const updateTransactionSchema = transactionFieldsSchema.partial()

const ids = z.array(z.uuid()).min(1).max(500)

export const bulkUpdateTransactionsSchema = z.object({
  ids,
  update: z
    .object({
      category_id: z.uuid().nullable(),
      status: z.enum(TRANSACTION_STATUSES),
      payment_mode: z.enum(PAYMENT_MODES).nullable(),
      recurring: z.boolean(),
      frequency: z.enum(FREQUENCIES).nullable(),
    })
    .partial()
    .refine((u) => Object.keys(u).length > 0, "Nothing to update."),
})

export const bulkDeleteTransactionsSchema = z.object({ ids })
export const addAttachmentsSchema = z.object({ attachments: z.array(attachmentSchema).min(1).max(20) })

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  color: z.string().max(30).nullable().optional(),
})
export const updateCategorySchema = createCategorySchema.partial()

export const createCategoryRuleSchema = z.object({
  pattern: z.string().trim().min(2, "Use at least 2 characters.").max(200),
  category_id: z.uuid(),
})

export type CreateTransactionInput = z.output<typeof createTransactionSchema>
export type UpdateTransactionInput = z.output<typeof updateTransactionSchema>
export type BulkTransactionUpdate = z.output<typeof bulkUpdateTransactionsSchema>["update"]
export type AttachmentInput = z.output<typeof attachmentSchema>
