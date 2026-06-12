import { supabase } from "@/lib/supabase"

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

export async function suggestCsvMapping(
  headers: string[],
  sampleRows: Record<string, string>[],
): Promise<CsvMapping> {
  const { data, error } = await supabase.functions.invoke("suggest-csv-mapping", {
    body: { headers, sampleRows },
  })
  if (error) throw error
  return data as CsvMapping
}

export async function extractDocumentData(
  source: { filePath: string } | { fileData: string; contentType: string },
): Promise<ExtractedDocument> {
  const { data, error } = await supabase.functions.invoke("extract-document-data", {
    body: source,
  })
  if (error) throw error
  return data as ExtractedDocument
}

export async function importTransactions(
  rows: {
    id: string
    date: string
    name: string
    counterparty_name?: string | null
    amount: number
    currency: string
    type: "income" | "expense"
    reference_number?: string | null
    note?: string | null
  }[],
): Promise<{ imported: number }> {
  const { data, error } = await supabase.functions.invoke("import-transactions", {
    body: { rows },
  })
  if (error) throw error
  return data as { imported: number }
}

export async function categorizeTransactions(
  rows: { id: string; description: string; counterparty: string }[],
  categoryNames: string[],
): Promise<Record<string, string>> {
  const { data, error } = await supabase.functions.invoke("categorize-transactions", {
    body: { rows, categoryNames },
  })
  if (error) throw error
  return data as Record<string, string>
}
