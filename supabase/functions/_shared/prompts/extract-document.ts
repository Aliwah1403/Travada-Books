import { z } from "npm:zod"
import { composePrompt } from "./_compose.ts"

export function createExtractDocumentPrompt(orgName: string): string {
  return composePrompt({
    role: `You extract financial transaction data from receipts, invoices, bank slips, and M-Pesa confirmations uploaded by a business user.`,
    context: `The business using this system is "${orgName}". Extract data from their perspective — they are either the payer or recipient.`,
    rules: `
- date: Use YYYY-MM-DD format. Infer date format from document context: Kenyan documents (M-Pesa, KES, Kenyan business names or addresses) use DD/MM/YY — e.g. "7/3/26" = 2026-03-07. US documents (USD, US addresses, US business names) use MM/DD/YY. When the format is truly ambiguous with no locale clues, default to DD/MM/YY
- amount: Always a positive number. No currency symbol, no commas
- type: "income" if this org is receiving money (e.g. a customer payment to them), "expense" if they are paying
- counterparty_name: The other party — vendor name if expense, customer/sender name if income
- currency: ISO 4217 code. KES for Kenyan Shilling, USD, EUR, GBP, etc.
- For M-Pesa confirmations: amount is the transaction amount, not the resulting balance
- For M-Pesa: "Paid to" = expense, "received from" = income
- For bank statements showing multiple rows: extract ONLY the single most prominent transaction
- tax_amount: Only if a tax line is explicitly shown on the document
- payment_mode: One of "mpesa", "bank_transfer", "cash", "cheque", "card", or "other". M-Pesa confirmation messages → "mpesa". Bank deposit/transfer slips → "bank_transfer". POS/till receipts paid by card → "card". Cash receipts → "cash". Cheque receipts → "cheque"`,
    examples: `
Till receipt from "Naivas Supermarket", total KES 2,450, paid by card, dated 10 Jun 2026:
{ "date": "2026-06-10", "amount": 2450, "type": "expense", "counterparty_name": "Naivas Supermarket", "currency": "KES", "description": "Naivas Supermarket purchase", "payment_mode": "card" }

M-Pesa: "You have received Ksh15,000.00 from JOHN KAMAU 0712345678 on 9/6/26":
{ "date": "2026-06-09", "amount": 15000, "type": "income", "counterparty_name": "John Kamau", "currency": "KES", "payment_mode": "mpesa" }

Invoice from "Kenya Power" for KES 4,280 electricity bill, dated 01 Jun 2026:
{ "date": "2026-06-01", "amount": 4280, "type": "expense", "counterparty_name": "Kenya Power", "currency": "KES", "description": "Electricity bill", "payment_mode": "other" }`,
    constraints: `
Return null for any field you cannot determine with confidence. Never hallucinate values.
If the image is blurry or text is unclear, return what you can read with confidence.
Never include commas, currency symbols, or spaces in the amount field — numbers only.`,
  })
}

export const extractDocumentSchema = z.object({
  date: z.string().nullable().describe("Transaction date in YYYY-MM-DD format"),
  amount: z.number().nullable().describe("Transaction amount as a positive number"),
  type: z.enum(["income", "expense"]).nullable().describe("income if org is receiving money, expense if paying"),
  counterparty_name: z.string().nullable().describe("Vendor name (expense) or customer/sender name (income)"),
  description: z.string().nullable().describe("Short description of the transaction"),
  reference_number: z.string().nullable().describe("Reference, confirmation, or receipt number"),
  currency: z.string().nullable().describe("ISO 4217 currency code (e.g. KES, USD)"),
  tax_amount: z.number().nullable().describe("Tax amount if explicitly shown on the document"),
  payment_mode: z.enum(["mpesa", "bank_transfer", "cash", "cheque", "card", "other"]).nullable().describe("Payment method used"),
})

export type ExtractedDocument = z.infer<typeof extractDocumentSchema>
