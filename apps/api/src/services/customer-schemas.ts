import { z } from "zod"

// The customer form's fields (create-customer-sheet / edit-customer-sheet).
// Lenient on purpose: the app's form already validates, and billing_cc is a
// comma-separated list. An empty string clears a field (saved as null).
const text = (max: number) => z.string().trim().max(max).nullable()

export const customerFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  email: text(320),
  billing_email: text(320),
  billing_cc: text(1000),
  phone: text(50),
  website: text(300),
  address_line1: text(200),
  address_line2: text(200),
  city: text(100),
  state: text(100),
  zip: text(20),
  country: text(100),
  country_code: z.string().trim().length(2).toUpperCase().nullable().or(z.literal("")),
  vat_number: text(50),
  note: text(5000),
  industry: text(100),
  company_type: text(100),
  preferred_currency: z.string().trim().length(3).toUpperCase().nullable().or(z.literal("")),
  main_contact: text(200),
})

/** Create: name required, everything else optional. */
export const createCustomerSchema = customerFieldsSchema.partial().required({ name: true })

/** Update: only the fields sent change. */
export const updateCustomerSchema = customerFieldsSchema.partial()

export const archiveCustomerSchema = z.object({ archived: z.boolean() })
export const customerPortalSchema = z.object({ enabled: z.boolean() })

export type CustomerFields = z.output<typeof updateCustomerSchema>
