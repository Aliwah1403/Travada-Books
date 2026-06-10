import { supabase } from "@/lib/supabase"

export type VaultDocument = {
  id: string
  org_id: string
  created_by: string | null
  name: string
  file_path: string
  file_size: number | null
  content_type: string | null
  source: "upload" | "transaction" | "inbox"
  transaction_id: string | null
  tags: string[] | null
  summary: string | null
  created_at: string
}

const DOCUMENT_SELECT = "id, org_id, created_by, name, file_path, file_size, content_type, source, transaction_id, tags, summary, created_at"

export type VaultFilters = {
  source?: "upload" | "transaction" | "inbox"
  search?: string
}

export async function listDocuments(orgId: string, filters: VaultFilters = {}): Promise<VaultDocument[]> {
  let query = supabase
    .from("documents")
    .select(DOCUMENT_SELECT)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })

  if (filters.source) query = query.eq("source", filters.source)
  if (filters.search) {
    query = query.textSearch("fts_vector", filters.search, { type: "websearch", config: "english" })
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as VaultDocument[]
}

export async function deleteDocument(id: string, filePath: string): Promise<void> {
  const { error } = await supabase.from("documents").delete().eq("id", id)
  if (error) throw error
  await supabase.storage.from("vault").remove([filePath])
}

export async function getDocumentSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("vault")
    .createSignedUrl(filePath, 60 * 60)
  if (error) throw error
  return data.signedUrl
}

export async function listRelatedDocuments(
  orgId: string,
  excludeId: string,
  name: string,
  limit = 5,
): Promise<VaultDocument[]> {
  // Extract meaningful keywords from the filename
  const keywords = name
    .replace(/\.[^.]+$/, "")           // strip extension
    .replace(/[_\-\.]+/g, " ")          // separators → spaces
    .replace(/\b\d{4,}\b/g, "")         // drop long numbers (years, timestamps)
    .replace(/\s+/g, " ")
    .trim()

  if (keywords.length < 3) return []

  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_SELECT)
    .eq("org_id", orgId)
    .neq("id", excludeId)
    .textSearch("fts_vector", keywords, { type: "websearch", config: "english" })
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return []   // graceful — related docs are non-critical
  return (data ?? []) as VaultDocument[]
}

export async function updateDocument(
  id: string,
  patch: { summary?: string | null; tags?: string[] | null },
): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

export async function renameDocument(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

export async function uploadDocument(
  orgId: string,
  file: File,
): Promise<void> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${orgId}/upload/${Date.now()}_${safe}`

  const { error: storageError } = await supabase.storage
    .from("vault")
    .upload(path, file, { upsert: false })

  if (storageError) throw storageError
  // Trigger auto-creates the documents row via on_vault_upload
}
