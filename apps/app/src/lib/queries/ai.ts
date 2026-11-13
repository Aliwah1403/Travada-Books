import { supabase } from "@/lib/supabase"

// A rate-limited edge function explains itself in the response body, which
// supabase-js hides behind a generic "non-2xx" message.
async function throwInvokeError(error: unknown): Promise<never> {
  const response = (error as { context?: Response }).context
  if (response?.status === 429) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? "Too many requests. Please try again in a few minutes.")
  }
  throw error
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
  if (error) await throwInvokeError(error)
  return data as CsvMapping
}

export async function extractDocumentData(
  source: { filePath: string } | { fileData: string; contentType: string },
): Promise<ExtractedDocument> {
  const { data, error } = await supabase.functions.invoke("extract-document-data", {
    body: source,
  })
  if (error) await throwInvokeError(error)
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

export async function classifyDocument(args: { filePath: string }): Promise<{ runId: string }> {
  const { data, error } = await supabase.functions.invoke("classify-document", { body: args })
  if (error) await throwInvokeError(error)
  return data as { runId: string }
}

export type ParsedTransactionFilters = {
  name?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  type?: "income" | "expense" | null
  status?: "pending" | "completed" | "excluded" | "archived" | null
  categoryName?: string | null
  paymentMode?: "mpesa" | "bank_transfer" | "cash" | "cheque" | "card" | "other" | null
  recurring?: boolean | null
  amountMin?: number | null
  amountMax?: number | null
}

export async function parseTransactionFilters(args: {
  input: string
  categories?: string[]
  currentDate?: string
  timezone?: string
}): Promise<ParsedTransactionFilters> {
  const { data, error } = await supabase.functions.invoke("parse-transaction-filters", {
    body: args,
  })
  if (error) await throwInvokeError(error)
  return data as ParsedTransactionFilters
}

export type ParsedInvoiceFilters = {
  name?: string | null
  statuses?: string[] | null
  dateFrom?: string | null
  dateTo?: string | null
  customers?: string[] | null
  recurring?: boolean | null
  amountMin?: number | null
  amountMax?: number | null
}

export async function parseInvoiceFilters(args: {
  input: string
  customers?: string[]
  currentDate?: string
  timezone?: string
}): Promise<ParsedInvoiceFilters> {
  const { data, error } = await supabase.functions.invoke("parse-invoice-filters", { body: args })
  if (error) await throwInvokeError(error)
  return data as ParsedInvoiceFilters
}

export type ParsedQuoteFilters = {
  name?: string | null
  statuses?: string[] | null
  dateFrom?: string | null
  dateTo?: string | null
  customers?: string[] | null
  amountMin?: number | null
  amountMax?: number | null
}

export async function parseQuoteFilters(args: {
  input: string
  customers?: string[]
  currentDate?: string
  timezone?: string
}): Promise<ParsedQuoteFilters> {
  const { data, error } = await supabase.functions.invoke("parse-quote-filters", { body: args })
  if (error) await throwInvokeError(error)
  return data as ParsedQuoteFilters
}

export type ParsedBillFilters = {
  name?: string | null
  status?: "unpaid" | "paid" | null
  overdue?: boolean | null
  dueFrom?: string | null
  dueTo?: string | null
  issuedFrom?: string | null
  issuedTo?: string | null
  paidFrom?: string | null
  paidTo?: string | null
  amountMin?: number | null
  amountMax?: number | null
  currencies?: string[] | null
  source?: "inbox" | "manual" | null
  matched?: boolean | null
}

export async function parseBillFilters(args: {
  input: string
  vendors?: string[]
  currentDate?: string
  timezone?: string
}): Promise<ParsedBillFilters> {
  const { data, error } = await supabase.functions.invoke("parse-bill-filters", { body: args })
  if (error) await throwInvokeError(error)
  return data as ParsedBillFilters
}

export type ParsedVaultFilters = {
  name?: string | null
  dateFrom?: string | null
  dateTo?: string | null
}

export async function parseVaultFilters(args: {
  input: string
  currentDate?: string
  timezone?: string
}): Promise<ParsedVaultFilters> {
  const { data, error } = await supabase.functions.invoke("parse-vault-filters", { body: args })
  if (error) await throwInvokeError(error)
  return data as ParsedVaultFilters
}

export async function categorizeTransactions(
  rows: { id: string; description: string; counterparty: string }[],
  categoryNames: string[],
): Promise<Record<string, string>> {
  const { data, error } = await supabase.functions.invoke("categorize-transactions", {
    body: { rows, categoryNames },
  })
  if (error) await throwInvokeError(error)
  return data as Record<string, string>
}
