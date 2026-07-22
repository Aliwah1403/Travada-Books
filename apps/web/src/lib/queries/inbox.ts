import { supabase } from "@/lib/supabase"

// ─── Types ──────────────────────────────────────────────────────────────────

export type InboxItemStatus =
  | "new"
  | "processing"
  | "analyzing"
  | "suggested_match"
  | "no_match"
  | "pending"
  | "done"
  | "archived"
  | "deleted"

export type InboxItemType = "invoice" | "expense" | "other"

export type InboxTransactionRef = {
  id: string
  name: string
  amount: number
  currency: string
  date: string
}

export type SuggestionStatus = "pending" | "confirmed" | "declined" | "expired" | "unmatched"
export type SuggestionMatchType = "auto_matched" | "high_confidence" | "suggested"

export type SuggestionTransactionRef = InboxTransactionRef & {
  counterparty_name: string | null
}

export type InboxSuggestion = {
  id: string
  inbox_item_id: string
  transaction_id: string
  confidence_score: number | null
  match_type: SuggestionMatchType | null
  status: SuggestionStatus
  transaction: SuggestionTransactionRef | null
}

export type InboxItem = {
  id: string
  org_id: string
  created_at: string
  file_path: string
  file_name: string
  content_type: string | null
  size: number | null
  display_name: string | null
  sender_email: string | null
  website: string | null
  date: string | null
  amount: number | null
  currency: string | null
  base_amount: number | null
  base_currency: string | null
  tax_amount: number | null
  tax_rate: number | null
  tax_type: "vat" | "wht" | "other" | null
  invoice_number: string | null
  type: InboxItemType | null
  status: InboxItemStatus
  transaction_id: string | null
  attachment_id: string | null
  reference_id: string | null
  meta: Record<string, unknown> | null
  transaction: InboxTransactionRef | null
  /**
   * The item's live (status='pending') suggestion, newest first. Only
   * populated by getInboxItem — listInboxItems omits it to keep list rows
   * cheap. Undefined when not fetched, null when fetched and none exists.
   */
  suggestion?: InboxSuggestion | null
}

// Raw shape returned by Supabase — the transaction join comes back as an array
// or object depending on PostgREST version; normalized in normalizeItem below.
type RawInboxItem = Omit<InboxItem, "transaction" | "suggestion"> & {
  transaction: InboxTransactionRef | InboxTransactionRef[] | null
}

type RawSuggestion = Omit<InboxSuggestion, "transaction" | "confidence_score"> & {
  confidence_score: number | string | null
  transaction: SuggestionTransactionRef | SuggestionTransactionRef[] | null
}

const INBOX_ITEM_SELECT = `
  id, org_id, created_at, file_path, file_name, content_type, size, display_name,
  sender_email, website, date, amount, currency, base_amount, base_currency,
  tax_amount, tax_rate, tax_type, invoice_number, type, status, transaction_id,
  attachment_id, reference_id, meta,
  transaction:transactions(id, name, amount, currency, date)
`

const SUGGESTION_SELECT = `
  id, inbox_item_id, transaction_id, confidence_score, match_type, status,
  transaction:transactions(id, name, amount, currency, date, counterparty_name)
`

function normalizeItem(raw: RawInboxItem): InboxItem {
  return {
    ...raw,
    transaction: Array.isArray(raw.transaction) ? (raw.transaction[0] ?? null) : raw.transaction,
  }
}

function normalizeSuggestion(raw: RawSuggestion): InboxSuggestion {
  const transaction = Array.isArray(raw.transaction) ? (raw.transaction[0] ?? null) : raw.transaction
  return {
    ...raw,
    confidence_score: raw.confidence_score != null ? Number(raw.confidence_score) : null,
    transaction: transaction
      ? { ...transaction, amount: Number(transaction.amount) }
      : null,
  }
}

// ─── Notifications (Phase 6) ────────────────────────────────────────────────
//
// Fire-and-forget wrapper around the notify-inbox edge function. Never
// awaited by callers for its result and never throws — a Novu/edge-function
// hiccup must not fail an upload or a suggestion confirm.
function notifyInboxEvent(event: string, orgId: string, payload: Record<string, unknown>): void {
  void supabase.functions
    .invoke("notify-inbox", { body: { event, orgId, ...payload } })
    .then(({ error }) => {
      if (error) console.error(`notify-inbox (${event}) failed:`, error)
    })
    .catch((err) => console.error(`notify-inbox (${event}) threw:`, err))
}

export type InboxFilters = {
  status?: InboxItemStatus
  /** "all" = invoice/expense (financial) docs, "other" = non-financial docs. */
  tab?: "all" | "other"
  q?: string
}

export type InboxOrder = "recent" | "oldest" | "alphabetical" | "document_date"

export type InboxItemsPage = {
  data: InboxItem[]
  count: number
}

const PAGE_SIZE = 30

// Strip PostgREST filter metacharacters and ILIKE wildcards before string interpolation
function sanitizeSearch(raw: string): string {
  return raw
    .trim()
    .replace(/[%_,.()*\\'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100)
}

// Mirrors Midday's buildSearchQuery: prefix-match each whitespace-separated term
// (`term:*`) and AND them together for to_tsquery('english', …). Midday escapes
// tsquery metacharacters with backslashes; we strip everything non-alphanumeric
// instead, because this string is interpolated into a PostgREST `.or()` filter
// rather than a parameterized query — stripping removes both the tsquery-syntax
// and the filter-injection risk in one step.
function buildInboxFtsQuery(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((term) => term.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .map((term) => `${term}:*`)
    .join(" & ")
    .slice(0, 200)
}

// ─── Inbox items ──────────────────────────────────────────────────────────────

export async function listInboxItems(
  orgId: string,
  filters: InboxFilters = {},
  page = 0,
  order: InboxOrder = "recent",
): Promise<InboxItemsPage> {
  let query = supabase
    .from("inbox_items")
    .select(INBOX_ITEM_SELECT, { count: "exact" })
    .eq("org_id", orgId)
    .neq("status", "deleted")

  if (filters.tab === "other") {
    query = query.eq("type", "other")
  } else {
    // "All" = financial docs (invoice/expense) plus items not yet classified (type is null)
    query = query.or("type.is.null,type.neq.other")
  }

  if (filters.status) query = query.eq("status", filters.status)

  if (filters.q) {
    const s = sanitizeSearch(filters.q)
    const numeric = Number(s)
    if (s && !Number.isNaN(numeric)) {
      // Numeric query → match the amount, like Midday's amount branch.
      query = query.eq("amount", numeric)
    } else if (s) {
      // Text query → FTS over the generated fts_vector (display_name + file_name)
      // first, then ILIKE fallbacks for substrings and fields the tsvector
      // doesn't cover (invoice_number), matching Midday's fts-OR-ilike approach.
      const clauses = [
        `display_name.ilike.%${s}%`,
        `file_name.ilike.%${s}%`,
        `invoice_number.ilike.%${s}%`,
      ]
      const fts = buildInboxFtsQuery(filters.q)
      if (fts) clauses.unshift(`fts_vector.fts(english).${fts}`)
      query = query.or(clauses.join(","))
    }
  }

  switch (order) {
    case "oldest":
      query = query.order("created_at", { ascending: true })
      break
    case "alphabetical":
      query = query.order("display_name", { ascending: true, nullsFirst: false })
      break
    case "document_date":
      query = query.order("date", { ascending: false, nullsFirst: false })
      break
    default:
      query = query.order("created_at", { ascending: false })
  }

  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw error
  return {
    data: ((data ?? []) as unknown as RawInboxItem[]).map(normalizeItem),
    count: count ?? 0,
  }
}

export async function getInboxItem(id: string): Promise<InboxItem | null> {
  const { data, error } = await supabase
    .from("inbox_items")
    .select(INBOX_ITEM_SELECT)
    .eq("id", id)
    .maybeSingle()
  if (error || !data) return null

  const item = normalizeItem(data as unknown as RawInboxItem)

  // Highest-confidence pending candidate first — NOT created_at desc, which
  // would surface the worst-ranked candidate (the matcher inserts ranked
  // candidates best-first, so "newest" is "worst").
  const { data: suggestionRow } = await supabase
    .from("transaction_match_suggestions")
    .select(SUGGESTION_SELECT)
    .eq("inbox_item_id", id)
    .eq("status", "pending")
    .order("confidence_score", { ascending: false })
    .limit(1)
    .maybeSingle()

  item.suggestion = suggestionRow ? normalizeSuggestion(suggestionRow as unknown as RawSuggestion) : null

  return item
}

export async function createInboxItem(orgId: string, file: File): Promise<InboxItem> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${orgId}/inbox/${Date.now()}_${safe}`

  const { error: storageError } = await supabase.storage
    .from("vault")
    .upload(path, file, { upsert: false })
  if (storageError) throw storageError

  const { data, error } = await supabase
    .from("inbox_items")
    .insert({
      org_id: orgId,
      file_path: path,
      file_name: file.name,
      content_type: file.type || null,
      size: file.size,
      display_name: file.name,
      status: "new",
      meta: { source: "upload" },
    })
    .select(INBOX_ITEM_SELECT)
    .single()

  if (error) throw error

  // Fire-and-forget: kick off extraction/embedding in the background (mirrors
  // vault's uploadDocument -> classifyDocument edge-fn bridge). The inbox list
  // polls while status is new/processing/analyzing, so we don't need to await
  // this or surface its result here.
  void supabase.functions
    .invoke("trigger-process-inbox", { body: { inboxItemId: data.id } })
    .then(({ error: invokeError }) => {
      if (invokeError) console.error("trigger-process-inbox failed:", invokeError)
    })

  notifyInboxEvent("inbox.new", orgId, { documentName: file.name, source: "upload" })

  return normalizeItem(data as unknown as RawInboxItem)
}

export async function deleteInboxItem(id: string, filePath: string): Promise<void> {
  const { error } = await supabase.from("inbox_items").delete().eq("id", id)
  if (error) throw error
  await supabase.storage.from("vault").remove([filePath])
  // Inbox files now also surface in Vault as source='inbox' documents (created
  // by the handle_vault_upload trigger). Storage removal doesn't cascade to the
  // documents row, so drop it here — otherwise Vault keeps a broken entry
  // pointing at a deleted file.
  await supabase.from("documents").delete().eq("file_path", filePath)
}

export async function bulkDeleteInboxItems(items: { id: string; file_path: string }[]): Promise<void> {
  const { error } = await supabase
    .from("inbox_items")
    .delete()
    .in("id", items.map((i) => i.id))
  if (error) throw error
  const filePaths = items.map((i) => i.file_path)
  await supabase.storage.from("vault").remove(filePaths)
  await supabase.from("documents").delete().in("file_path", filePaths)
}

export async function updateInboxStatus(id: string, status: InboxItemStatus): Promise<void> {
  const { error } = await supabase.from("inbox_items").update({ status }).eq("id", id)
  if (error) throw error
}

export async function getInboxSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("vault")
    .createSignedUrl(filePath, 60 * 60)
  if (error) throw error
  return data.signedUrl
}

// ─── Inbox email address ────────────────────────────────────────────────────

export function getInboxEmail(org: { inbox_id?: string | null } | null): string | null {
  if (!org?.inbox_id) return null
  return `${org.inbox_id}@inbox.travadasys.com`
}

// ─── Suggestion lifecycle (Batch 4) ────────────────────────────────────────
//
// confirmSuggestion / matchTransaction both attach the inbox item's file to a
// transaction. The file already lives in the "vault" storage bucket at the
// inbox item's file_path — transaction_attachments.file_path is just a text
// column into that same bucket (see deleteAttachment in queries/transactions.ts,
// which also targets "vault"), so no storage copy is needed, only a new
// transaction_attachments row pointing at the existing path.

async function attachInboxFileToTransaction(
  inboxItemId: string,
  transactionId: string,
  orgId: string,
): Promise<void> {
  const { data: item, error: itemError } = await supabase
    .from("inbox_items")
    .select("file_path, file_name, content_type, size")
    .eq("id", inboxItemId)
    .single()
  if (itemError || !item) throw itemError ?? new Error("Inbox item not found")

  const { data: attachment, error: attachmentError } = await supabase
    .from("transaction_attachments")
    .insert({
      transaction_id: transactionId,
      org_id: orgId,
      file_path: item.file_path,
      file_name: item.file_name,
      file_size: item.size,
      content_type: item.content_type,
    })
    .select("id")
    .single()
  if (attachmentError || !attachment) throw attachmentError ?? new Error("Failed to create attachment")

  const { error: updateError } = await supabase
    .from("inbox_items")
    .update({ transaction_id: transactionId, attachment_id: attachment.id, status: "done" })
    .eq("id", inboxItemId)
  if (updateError) throw updateError
}

/**
 * Confirm a pending suggestion: attach the file, mark the item done, and
 * record the suggestion outcome (status='confirmed'). Recording the outcome
 * — not just attaching — is what feeds merchant pattern learning (3e).
 *
 * documentName/transactionName are supplied by the caller (already on
 * hand from the item/suggestion it's rendering) rather than re-fetched here,
 * to feed the inbox.match_confirmed notification without an extra round trip.
 */
export async function confirmSuggestion(
  suggestionId: string,
  inboxItemId: string,
  transactionId: string,
  orgId: string,
  userId: string,
  documentName: string,
  transactionName: string,
  actorName?: string | null,
): Promise<void> {
  await attachInboxFileToTransaction(inboxItemId, transactionId, orgId)

  const { error } = await supabase
    .from("transaction_match_suggestions")
    .update({ status: "confirmed", user_id: userId, user_action_at: new Date().toISOString() })
    .eq("id", suggestionId)
  if (error) throw error

  notifyInboxEvent("inbox.match_confirmed", orgId, {
    documentName,
    transactionName,
    inboxId: inboxItemId,
    ...(actorName ? { actorName } : {}),
  })
}

/**
 * Decline a pending suggestion. Mirrors Midday: the item always drops back
 * to `pending` (manual match) — never auto-chains to another ranked
 * candidate, even if the matcher wrote more than one pending suggestion for
 * this item. Without this, a sibling candidate at a near-identical
 * confidence score would silently replace the declined one, reading as "my
 * decline didn't do anything" rather than "a different match was offered."
 *
 * The declined suggestion is kept (status='declined') — the partial unique
 * index on (inbox_item_id, transaction_id) plus the worker's blocked-pair
 * pre-filter mean it's never re-suggested. Sibling pending suggestions are
 * marked 'expired' rather than 'declined': the user never actually rejected
 * those specific candidates, so they should remain eligible for a future
 * matching run instead of being permanently blocked.
 */
export async function declineSuggestion(
  suggestionId: string,
  inboxItemId: string,
  userId: string,
): Promise<void> {
  const { error: suggestionError } = await supabase
    .from("transaction_match_suggestions")
    .update({ status: "declined", user_id: userId, user_action_at: new Date().toISOString() })
    .eq("id", suggestionId)
  if (suggestionError) throw suggestionError

  const { error: expireError } = await supabase
    .from("transaction_match_suggestions")
    .update({ status: "expired" })
    .eq("inbox_item_id", inboxItemId)
    .eq("status", "pending")
  if (expireError) throw expireError

  const { error: itemError } = await supabase
    .from("inbox_items")
    .update({ status: "pending" })
    .eq("id", inboxItemId)
  if (itemError) throw itemError
}

/**
 * Manual match (no suggestion row exists yet, or the user picked a different
 * transaction than the one suggested). Still writes a suggestion row
 * (match_type='suggested', status='confirmed') so the merchant-learning
 * history records the user's manual choice too. Upserts by hand rather than
 * `.upsert()` — the (inbox_item_id, transaction_id) unique index is partial
 * (`WHERE status != 'expired'`), which PostgREST's on_conflict can't target.
 */
export async function matchTransaction(
  inboxItemId: string,
  transactionId: string,
  orgId: string,
  userId: string,
): Promise<void> {
  await attachInboxFileToTransaction(inboxItemId, transactionId, orgId)

  const { data: existing } = await supabase
    .from("transaction_match_suggestions")
    .select("id")
    .eq("inbox_item_id", inboxItemId)
    .eq("transaction_id", transactionId)
    .neq("status", "expired")
    .maybeSingle()

  const outcome = {
    match_type: "suggested" as const,
    status: "confirmed" as const,
    user_id: userId,
    user_action_at: new Date().toISOString(),
  }

  const { error } = existing
    ? await supabase.from("transaction_match_suggestions").update(outcome).eq("id", existing.id)
    : await supabase.from("transaction_match_suggestions").insert({
        org_id: orgId,
        inbox_item_id: inboxItemId,
        transaction_id: transactionId,
        ...outcome,
      })
  if (error) throw error
}

/**
 * Detach a matched transaction. Deliberately does NOT remove the storage
 * file — it's the same file the inbox item itself previews, shared with
 * transaction_attachments rather than copied.
 */
export async function unmatchTransaction(inboxItemId: string): Promise<void> {
  const { data: item, error: itemError } = await supabase
    .from("inbox_items")
    .select("attachment_id, transaction_id")
    .eq("id", inboxItemId)
    .single()
  if (itemError || !item) throw itemError ?? new Error("Inbox item not found")

  if (item.attachment_id) {
    const { error: attachmentError } = await supabase
      .from("transaction_attachments")
      .delete()
      .eq("id", item.attachment_id)
    if (attachmentError) throw attachmentError
  }

  const { error: updateError } = await supabase
    .from("inbox_items")
    .update({ transaction_id: null, attachment_id: null, status: "pending" })
    .eq("id", inboxItemId)
  if (updateError) throw updateError

  if (item.transaction_id) {
    const { error: suggestionError } = await supabase
      .from("transaction_match_suggestions")
      .update({ status: "unmatched" })
      .eq("inbox_item_id", inboxItemId)
      .eq("transaction_id", item.transaction_id)
      .eq("status", "confirmed")
    if (suggestionError) throw suggestionError
  }
}

/** Re-run extraction/matching for an item (stuck items, or a bad initial match). */
export async function retryMatching(inboxItemId: string): Promise<void> {
  const { error } = await supabase.from("inbox_items").update({ status: "analyzing" }).eq("id", inboxItemId)
  if (error) throw error

  const { error: invokeError } = await supabase.functions.invoke("trigger-process-inbox", {
    body: { inboxItemId },
  })
  if (invokeError) throw invokeError
}

// ─── Manual transaction search (match combobox) ────────────────────────────

export type TransactionMatchCandidate = {
  id: string
  name: string
  amount: number
  currency: string
  date: string
  counterparty_name: string | null
  /** True if some OTHER inbox item is already matched to this transaction. */
  already_matched: boolean
}

const RECENT_CANDIDATES_LIMIT = 8
const SEARCH_CANDIDATES_LIMIT = 20

export async function searchTransactionMatch(
  orgId: string,
  query: string,
  opts: { amount?: number | null; date?: string | null } = {},
): Promise<TransactionMatchCandidate[]> {
  let q = supabase
    .from("transactions")
    .select("id, name, amount, currency, date, counterparty_name")
    .eq("org_id", orgId)

  const s = sanitizeSearch(query)
  if (s) {
    q = q.or(`name.ilike.%${s}%,counterparty_name.ilike.%${s}%`)
  } else if (opts.amount != null) {
    // No search text yet — bias toward transactions near the inbox item's amount.
    const abs = Math.abs(opts.amount)
    q = q.gte("amount", abs * 0.9).lte("amount", abs * 1.1)
  }

  q = q.order("date", { ascending: false }).limit(s ? SEARCH_CANDIDATES_LIMIT : RECENT_CANDIDATES_LIMIT)

  const { data, error } = await q
  if (error) throw error
  const transactions = data ?? []
  if (transactions.length === 0) return []

  const ids = transactions.map((t) => t.id)
  const { data: matchedRows } = await supabase
    .from("inbox_items")
    .select("transaction_id")
    .in("transaction_id", ids)

  const matchedIds = new Set((matchedRows ?? []).map((r) => r.transaction_id))

  return transactions.map((t) => ({
    id: t.id,
    name: t.name,
    amount: Number(t.amount),
    currency: t.currency,
    date: t.date,
    counterparty_name: t.counterparty_name,
    already_matched: matchedIds.has(t.id),
  }))
}

// ─── Blocklist ──────────────────────────────────────────────────────────────

export type BlocklistEntry = {
  id: string
  org_id: string
  type: "email" | "domain"
  value: string
  created_at: string
}

export async function listBlocklist(orgId: string): Promise<BlocklistEntry[]> {
  const { data, error } = await supabase
    .from("inbox_blocklist")
    .select("id, org_id, type, value, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function addBlocklistEntry(
  orgId: string,
  type: "email" | "domain",
  value: string,
): Promise<BlocklistEntry> {
  const { data, error } = await supabase
    .from("inbox_blocklist")
    .insert({ org_id: orgId, type, value: value.toLowerCase().trim() })
    .select("id, org_id, type, value, created_at")
    .single()
  if (error) throw error
  return data
}

export async function removeBlocklistEntry(id: string): Promise<void> {
  const { error } = await supabase.from("inbox_blocklist").delete().eq("id", id)
  if (error) throw error
}
