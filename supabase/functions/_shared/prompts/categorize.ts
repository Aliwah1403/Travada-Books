import { composePrompt } from "./_compose.ts"

export interface CategorizationRow {
  id: string
  description: string
  counterparty: string
}

export function createCategorizePrompt(
  categories: string[],
  rows: CategorizationRow[],
): string {
  return composePrompt({
    role: `You assign categories to financial transactions for a bookkeeping application. You are fast and precise.`,
    context: `Available categories:\n${categories.join(", ")}\n\nTransactions to categorize:\n${JSON.stringify(rows, null, 2)}`,
    rules: `
- Return a JSON object mapping each transaction id to a category name from the list above (exact match)
- Use "Uncategorized" only if genuinely no category fits
- Common Kenya-specific patterns:
  - "Safaricom" / "M-Pesa fee" / "service charge" → "Bank & Transaction Fees"
  - "Kenya Power" / "KPLC" / "Nairobi Water" / utility companies → "Utilities"
  - "Naivas" / "Carrefour" / "Quickmart" / supermarkets → "Office Supplies" (assume business context)
  - "salary" / "payroll" / "wages" / staff names → "Salaries & Wages"
  - "rent" / "lease" / "office" → "Rent & Lease"
  - "fuel" / "petrol" / "diesel" / "Total Kenya" / "Rubis" → "Travel & Transportation"
  - "internet" / "Safaricom Home" / "Zuku" / "Airtel" → "Utilities"
  - "advertising" / "Facebook ads" / "Google ads" / "marketing" → "Advertising & Marketing"`,
    examples: `
Input rows: [{"id":"a","description":"Kenya Power bill","counterparty":"KPLC"},{"id":"b","description":"Staff salary June","counterparty":"Jane Wanjiku"},{"id":"c","description":"M-Pesa transfer fee","counterparty":"Safaricom"}]
Output: { "a": "Utilities", "b": "Salaries & Wages", "c": "Bank & Transaction Fees" }`,
    constraints: `Return only a flat JSON object mapping id strings to category name strings. No explanation, no markdown, no extra fields.`,
  })
}
