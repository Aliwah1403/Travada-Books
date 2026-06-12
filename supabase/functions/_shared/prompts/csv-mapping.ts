import { composePrompt } from "./_compose.ts"

export function createCsvMappingPrompt(
  headers: string[],
  sampleRows: Record<string, string>[],
): string {
  return composePrompt({
    role: `You map column names from a CSV file to transaction fields for a bookkeeping application.`,
    context: `Available CSV columns: ${headers.join(", ")}\n\nFirst rows of data:\n${sampleRows
      .slice(0, 3)
      .map((r) => JSON.stringify(r))
      .join("\n")}`,
    rules: `
- Return the exact CSV column name for each field, or omit if no confident match
- For "type": look for columns like Debit/Credit, Type, Transaction Type — return the column name
- For "amount_sign": set true if positive values represent income (deposits/credits), false if positive = expense
- For "currency": return a column name if one exists (e.g. "Currency", "CCY"), or detect the ISO code from amount values (e.g. "KES", "USD", "EUR")
- If a single amount column mixes credits/debits via sign (positive/negative), map it to "amount" and set "amount_sign" accordingly
- If separate debit and credit columns exist, map to "debit_column" and "credit_column" — leave "amount" empty`,
    examples: `
Input columns: ["Txn Date", "Narration", "Debit", "Credit", "Running Balance"]
Output: { "date": "Txn Date", "description": "Narration", "debit_column": "Debit", "credit_column": "Credit" }

Input columns: ["Date", "Description", "Amount", "Type", "Reference No"]
Output: { "date": "Date", "description": "Description", "amount": "Amount", "type": "Type", "reference": "Reference No", "amount_sign": true }

Input columns: ["Transaction Date", "Particulars", "Withdrawal (Dr)", "Deposit (Cr)", "Currency", "Balance"]
Output: { "date": "Transaction Date", "description": "Particulars", "debit_column": "Withdrawal (Dr)", "credit_column": "Deposit (Cr)", "currency": "Currency" }`,
    constraints: `Return only a JSON object. Omit fields you are not confident about. Never guess or hallucinate column names not in the provided list.`,
  })
}

export interface CsvMapping {
  date?: string
  description?: string
  amount?: string
  debit_column?: string
  credit_column?: string
  type?: string
  counterparty?: string
  category?: string
  reference?: string
  notes?: string
  currency?: string
  amount_sign?: boolean
}

export const csvMappingJsonSchema = {
  name: "csv_mapping",
  strict: true,
  schema: {
    type: "object",
    properties: {
      date: { type: "string", description: "CSV column name for the transaction date" },
      description: { type: "string", description: "CSV column name for transaction description/narration" },
      amount: { type: "string", description: "CSV column name for a single signed amount column" },
      debit_column: { type: "string", description: "CSV column name for debit/withdrawal amounts" },
      credit_column: { type: "string", description: "CSV column name for credit/deposit amounts" },
      type: { type: "string", description: "CSV column name for transaction type (income/expense/debit/credit)" },
      counterparty: { type: "string", description: "CSV column name for counterparty/payee/payer name" },
      category: { type: "string", description: "CSV column name for transaction category" },
      reference: { type: "string", description: "CSV column name for reference number" },
      notes: { type: "string", description: "CSV column name for notes or remarks" },
      currency: { type: "string", description: "CSV column name OR detected ISO 4217 currency code" },
      amount_sign: { type: "boolean", description: "true if positive amounts = income, false if positive = expense" },
    },
    required: [],
    additionalProperties: false,
  },
}
