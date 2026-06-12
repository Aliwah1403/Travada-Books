import { supabase } from "@/lib/supabase"

// ─── Types ──────────────────────────────────────────────────────────────────

export type TransactionCategory = {
  id: string
  org_id: string
  name: string
  slug: string
  color: string | null
  system: boolean
  created_at: string
}

export type TransactionAttachment = {
  id: string
  transaction_id: string
  org_id: string
  file_path: string
  file_name: string
  file_size: number | null
  content_type: string | null
  created_at: string
}

export type Transaction = {
  id: string
  org_id: string
  created_by: string | null
  date: string
  name: string
  counterparty_name: string | null
  customer_id: string | null
  amount: number
  currency: string
  type: "income" | "expense"
  status: "pending" | "completed" | "excluded" | "archived"
  payment_mode: "mpesa" | "bank_transfer" | "cash" | "cheque" | "card" | "other" | null
  category_id: string | null
  invoice_id: string | null
  tax_amount: number | null
  tax_rate: number | null
  tax_type: "vat" | "wht" | "other" | null
  recurring: boolean
  frequency: "weekly" | "biweekly" | "monthly" | "semi_monthly" | "annually" | "irregular" | null
  internal: boolean
  reference_number: string | null
  note: string | null
  manual: boolean
  created_at: string
  category: Pick<TransactionCategory, "id" | "name" | "slug" | "color"> | null
  invoice: { id: string; invoice_number: string | null } | null
  attachments: Pick<TransactionAttachment, "id" | "file_path" | "file_name" | "file_size" | "content_type">[]
}

export type TransactionInput = {
  id: string
  date: string
  name: string
  counterparty_name?: string
  customer_id?: string
  amount: number
  currency: string
  type: "income" | "expense"
  status?: "pending" | "completed" | "excluded" | "archived"
  payment_mode?: "mpesa" | "bank_transfer" | "cash" | "cheque" | "card" | "other"
  category_id?: string
  invoice_id?: string
  tax_amount?: number
  tax_rate?: number
  tax_type?: "vat" | "wht" | "other"
  recurring?: boolean
  frequency?: "weekly" | "biweekly" | "monthly" | "semi_monthly" | "annually" | "irregular"
  internal?: boolean
  reference_number?: string
  note?: string
  markInvoicePaid?: boolean
  attachments?: AttachmentInput[]
}

export type AttachmentInput = {
  file_path: string
  file_name: string
  file_size?: number
  content_type?: string
}

export type TransactionFilters = {
  search?: string
  dateFrom?: string
  dateTo?: string
  type?: "income" | "expense"
  status?: "pending" | "completed" | "excluded" | "archived"
  categoryIds?: string[]
  paymentMode?: string
  recurring?: boolean
}

export type TransactionsPage = {
  data: Transaction[]
  count: number
}

const TRANSACTION_SELECT = `
  id, org_id, created_by, date, name, counterparty_name, customer_id, amount, currency,
  type, status, payment_mode, category_id, invoice_id,
  tax_amount, tax_rate, tax_type, recurring, frequency, internal,
  reference_number, note, manual, created_at,
  category:transaction_categories(id, name, slug, color),
  invoice:invoices(id, invoice_number),
  attachments:transaction_attachments(id, file_path, file_name, file_size, content_type)
`

const CATEGORY_SELECT = "id, org_id, name, slug, color, system, created_at"

const PAGE_SIZE = 50

// ─── Transactions ────────────────────────────────────────────────────────────

export async function listTransactions(
  orgId: string,
  filters: TransactionFilters = {},
  page = 0,
): Promise<TransactionsPage> {
  let query = supabase
    .from("transactions")
    .select(TRANSACTION_SELECT, { count: "exact" })
    .eq("org_id", orgId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (filters.search) {
    query = query.textSearch("fts_vector", filters.search, { type: "websearch", config: "english" })
  }
  if (filters.dateFrom) query = query.gte("date", filters.dateFrom)
  if (filters.dateTo) query = query.lte("date", filters.dateTo)
  if (filters.type) query = query.eq("type", filters.type)
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.categoryIds?.length) query = query.in("category_id", filters.categoryIds)
  if (filters.paymentMode) query = query.eq("payment_mode", filters.paymentMode)
  if (filters.recurring !== undefined) query = query.eq("recurring", filters.recurring)

  const { data, error, count } = await query
  if (error) throw error
  return { data: (data ?? []) as unknown as Transaction[], count: count ?? 0 }
}

export async function getTransaction(id: string): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_SELECT)
    .eq("id", id)
    .single()

  if (error) throw error
  return data as unknown as Transaction
}

export async function createTransaction(
  orgId: string,
  userId: string,
  input: TransactionInput,
): Promise<string> {
  const { id, markInvoicePaid, attachments, ...rest } = input

  if (input.invoice_id && markInvoicePaid) {
    const result = await supabase.rpc("create_transaction_and_mark_invoice_paid", {
      p_id: id,
      p_org_id: orgId,
      p_created_by: userId,
      p_date: rest.date,
      p_name: rest.name,
      p_counterparty_name: rest.counterparty_name ?? null,
      p_customer_id: rest.customer_id ?? null,
      p_amount: rest.amount,
      p_currency: rest.currency,
      p_type: rest.type,
      p_status: rest.status ?? "completed",
      p_payment_mode: rest.payment_mode ?? null,
      p_category_id: rest.category_id ?? null,
      p_invoice_id: input.invoice_id,
      p_tax_amount: rest.tax_amount ?? null,
      p_tax_rate: rest.tax_rate ?? null,
      p_tax_type: rest.tax_type ?? null,
      p_recurring: rest.recurring ?? false,
      p_frequency: rest.frequency ?? null,
      p_internal: rest.internal ?? false,
      p_reference_number: rest.reference_number ?? null,
      p_note: rest.note ?? null,
      p_attachments: attachments?.length ? attachments : null,
    })
    if (result.error) throw result.error
    return id
  }

  const { error: txError } = await supabase.from("transactions").insert({
    id,
    org_id: orgId,
    created_by: userId,
    date: rest.date,
    name: rest.name,
    counterparty_name: rest.counterparty_name ?? null,
    customer_id: rest.customer_id ?? null,
    amount: rest.amount,
    currency: rest.currency,
    type: rest.type,
    status: rest.status ?? "completed",
    payment_mode: rest.payment_mode ?? null,
    category_id: rest.category_id ?? null,
    invoice_id: rest.invoice_id ?? null,
    tax_amount: rest.tax_amount ?? null,
    tax_rate: rest.tax_rate ?? null,
    tax_type: rest.tax_type ?? null,
    recurring: rest.recurring ?? false,
    frequency: rest.frequency ?? null,
    internal: rest.internal ?? false,
    reference_number: rest.reference_number ?? null,
    note: rest.note ?? null,
  })
  if (txError) throw txError

  if (attachments?.length) {
    const { error: attError } = await supabase.from("transaction_attachments").insert(
      attachments.map((a) => ({
        transaction_id: id,
        org_id: orgId,
        file_path: a.file_path,
        file_name: a.file_name,
        file_size: a.file_size ?? null,
        content_type: a.content_type ?? null,
      })),
    )
    if (attError) throw attError
  }

  return id
}

export async function updateTransaction(
  id: string,
  orgId: string,
  input: Partial<Omit<TransactionInput, "id" | "markInvoicePaid" | "attachments">>,
): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update(input)
    .eq("id", id)
    .eq("org_id", orgId)

  if (error) throw error
}

export async function deleteTransaction(id: string, orgId: string): Promise<void> {
  // Fetch attachment paths for storage cleanup
  const { data: attachments } = await supabase
    .from("transaction_attachments")
    .select("file_path")
    .eq("transaction_id", id)

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId)

  if (error) throw error

  // Best-effort storage cleanup after row is gone
  if (attachments?.length) {
    await supabase.storage
      .from("vault")
      .remove(attachments.map((a) => a.file_path))
  }
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export async function addAttachments(
  transactionId: string,
  orgId: string,
  attachments: AttachmentInput[],
): Promise<void> {
  const { error } = await supabase.from("transaction_attachments").insert(
    attachments.map((a) => ({
      transaction_id: transactionId,
      org_id: orgId,
      file_path: a.file_path,
      file_name: a.file_name,
      file_size: a.file_size ?? null,
      content_type: a.content_type ?? null,
    })),
  )
  if (error) throw error
}

export async function deleteAttachment(id: string, filePath: string): Promise<void> {
  const { error } = await supabase.from("transaction_attachments").delete().eq("id", id)
  if (error) throw error
  await supabase.storage.from("vault").remove([filePath])
}

export async function getAttachmentSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("vault")
    .createSignedUrl(filePath, 60 * 60) // 1 hour

  if (error) throw error
  return data.signedUrl
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function listTransactionCategories(orgId: string): Promise<TransactionCategory[]> {
  const { data, error } = await supabase
    .from("transaction_categories")
    .select(CATEGORY_SELECT)
    .eq("org_id", orgId)
    .order("system", { ascending: false })
    .order("name")

  if (error) throw error
  return data ?? []
}

export async function createTransactionCategory(
  orgId: string,
  input: { name: string; color?: string },
): Promise<TransactionCategory> {
  const slug = input.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  const { data, error } = await supabase
    .from("transaction_categories")
    .insert({ org_id: orgId, name: input.name, slug, color: input.color ?? null })
    .select(CATEGORY_SELECT)
    .single()

  if (error) {
    if (error.code === "23505") throw new Error("A category with this name already exists.")
    throw error
  }
  return data
}

export async function updateTransactionCategory(
  id: string,
  orgId: string,
  input: { name?: string; color?: string },
): Promise<TransactionCategory> {
  const { data, error } = await supabase
    .from("transaction_categories")
    .update(input)
    .eq("id", id)
    .eq("org_id", orgId)
    .select(CATEGORY_SELECT)
    .single()

  if (error) throw error
  return data
}

export async function deleteTransactionCategory(id: string, orgId: string): Promise<void> {
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)

  if (count && count > 0) {
    throw new Error(`This category is used by ${count} transaction${count === 1 ? "" : "s"} and cannot be deleted.`)
  }

  const { error } = await supabase
    .from("transaction_categories")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId)

  if (error) throw error
}

export async function bulkSetCategories(
  assignments: { transactionId: string; categoryId: string }[],
): Promise<void> {
  await Promise.all(
    assignments.map(({ transactionId, categoryId }) =>
      supabase
        .from("transactions")
        .update({ category_id: categoryId })
        .eq("id", transactionId),
    ),
  )
}

export async function bulkCreateTransactions(
  orgId: string,
  userId: string,
  inputs: Omit<TransactionInput, "attachments" | "markInvoicePaid">[],
): Promise<number> {
  const rows = inputs.map((input) => ({
    id: input.id,
    org_id: orgId,
    created_by: userId,
    date: input.date,
    name: input.name,
    counterparty_name: input.counterparty_name ?? null,
    amount: input.amount,
    currency: input.currency,
    type: input.type,
    status: input.status ?? "completed",
    payment_mode: input.payment_mode ?? null,
    category_id: input.category_id ?? null,
    tax_amount: input.tax_amount ?? null,
    tax_rate: input.tax_rate ?? null,
    tax_type: input.tax_type ?? null,
    recurring: input.recurring ?? false,
    frequency: input.frequency ?? null,
    internal: input.internal ?? false,
    reference_number: input.reference_number ?? null,
    note: input.note ?? null,
    manual: true,
  }))

  const { error } = await supabase.from("transactions").insert(rows)
  if (error) throw error
  return rows.length
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

export function transactionStoragePath(orgId: string, transactionId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  return `${orgId}/transactions/${transactionId}/${Date.now()}_${safe}`
}

export async function uploadTransactionAttachment(
  orgId: string,
  transactionId: string,
  file: File,
): Promise<AttachmentInput> {
  const path = transactionStoragePath(orgId, transactionId, file.name)
  const { error } = await supabase.storage
    .from("vault")
    .upload(path, file, { upsert: false })

  if (error) throw error

  return {
    file_path: path,
    file_name: file.name,
    file_size: file.size,
    content_type: file.type,
  }
}
