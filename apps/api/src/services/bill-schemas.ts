import { z } from "zod"

// The bill form's fields (components/bills/bill-form-sheet.tsx).
const optionalText = (max: number) => z.string().trim().max(max).nullable()

export const billFieldsSchema = z.object({
  vendor_name: z.string().trim().min(1, "Supplier is required.").max(300),
  bill_number: optionalText(100),
  amount: z.number().nonnegative(),
  currency: z.string().trim().length(3).toUpperCase(),
  issue_date: z.iso.date().nullable(),
  due_date: z.iso.date().nullable(),
  note: optionalText(5000),
})

export const createBillSchema = billFieldsSchema
  .partial()
  .required({ vendor_name: true, amount: true, currency: true })

export const updateBillSchema = billFieldsSchema.partial()

export const setBillPaidSchema = z.object({
  paid: z.boolean(),
  /** Defaults to today in the user's timezone. */
  paid_on: z.iso.date().optional(),
})

export const billFromInboxSchema = z.object({ inbox_item_id: z.uuid() })

export type CreateBillInput = z.output<typeof createBillSchema>
export type UpdateBillInput = z.output<typeof updateBillSchema>
