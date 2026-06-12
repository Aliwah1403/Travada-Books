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

export interface ExtractedDocument {
  date: string | null
  amount: number | null
  type: "income" | "expense" | null
  counterparty_name: string | null
  description: string | null
  reference_number: string | null
  currency: string | null
  tax_amount: number | null
  payment_mode: "mpesa" | "bank_transfer" | "cash" | "cheque" | "card" | "other" | null
}

export const extractDocumentJsonSchema = {
  name: "extracted_document",
  strict: true,
  schema: {
    type: "object",
    properties: {
      date: { type: ["string", "null"], description: "Transaction date in YYYY-MM-DD format" },
      amount: { type: ["number", "null"], description: "Transaction amount as a positive number" },
      type: { type: ["string", "null"], enum: ["income", "expense", null], description: "income if org is receiving money, expense if paying" },
      counterparty_name: { type: ["string", "null"], description: "Vendor name (expense) or customer/sender name (income)" },
      description: { type: ["string", "null"], description: "Short description of the transaction" },
      reference_number: { type: ["string", "null"], description: "Reference, confirmation, or receipt number" },
      currency: { type: ["string", "null"], description: "ISO 4217 currency code (e.g. KES, USD)" },
      tax_amount: { type: ["number", "null"], description: "Tax amount if explicitly shown on the document" },
      payment_mode: {
        type: ["string", "null"],
        enum: ["mpesa", "bank_transfer", "cash", "cheque", "card", "other", null],
        description: "Payment method used in the transaction",
      },
    },
    required: ["date", "amount", "type", "counterparty_name", "description", "reference_number", "currency", "tax_amount", "payment_mode"],
    additionalProperties: false,
  },
}
