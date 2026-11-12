import { z } from "zod"

/** Generate a statement of account for one customer over a period. */
export const createStatementSchema = z
  .object({
    customer_id: z.uuid(),
    date_from: z.iso.date(),
    date_to: z.iso.date(),
    notes: z.string().trim().max(2000).nullable().default(null),
    include_pdf: z.boolean().default(true),
    /** Email it to the customer straight after creating it. */
    send: z.boolean().default(false),
  })
  .refine((v) => v.date_to >= v.date_from, { message: "End date must be on or after the start date.", path: ["date_to"] })

export type CreateStatementInput = z.output<typeof createStatementSchema>
