import { supabase } from "@/lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

export type VaultFolder = {
  id: string
  org_id: string
  name: string
  is_system: boolean
  parent_id: string | null
  created_at: string
}

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
  folder_id: string | null
  tags: string[] | null
  summary: string | null
  created_at: string
}

const DOCUMENT_SELECT =
  "id, org_id, created_by, name, file_path, file_size, content_type, source, transaction_id, folder_id, tags, summary, created_at"

export type VaultFilters = {
  source?: "upload" | "transaction" | "inbox"
  search?: string
  folderId?: string
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function listDocuments(orgId: string, filters: VaultFilters = {}): Promise<VaultDocument[]> {
  let query = supabase
    .from("documents")
    .select(DOCUMENT_SELECT)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })

  if (filters.source) query = query.eq("source", filters.source)
  if (filters.folderId) query = query.eq("folder_id", filters.folderId)
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
  const keywords = name
    .replace(/\.[^.]+$/, "")
    .replace(/[_\-\.]+/g, " ")
    .replace(/\b\d{4,}\b/g, "")
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

  if (error) return []
  return (data ?? []) as VaultDocument[]
}

export async function updateDocument(
  id: string,
  patch: { summary?: string | null; tags?: string[] | null; folder_id?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

export async function setDocumentFolder(filePath: string, folderId: string | null): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({ folder_id: folderId, updated_at: new Date().toISOString() })
    .eq("file_path", filePath)
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
  folderId?: string | null,
): Promise<void> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${orgId}/upload/${Date.now()}_${safe}`

  const { error: storageError } = await supabase.storage
    .from("vault")
    .upload(path, file, { upsert: false })

  if (storageError) throw storageError

  if (folderId) {
    await supabase
      .from("documents")
      .update({ folder_id: folderId })
      .eq("file_path", path)
  }
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export async function listFolders(
  orgId: string,
  parentId: string | null = null,
): Promise<VaultFolder[]> {
  let query = supabase
    .from("vault_folders")
    .select("id, org_id, name, is_system, parent_id, created_at")
    .eq("org_id", orgId)
    .order("is_system", { ascending: false })
    .order("created_at", { ascending: true })

  if (parentId === null) {
    query = query.is("parent_id", null)
  } else {
    query = query.eq("parent_id", parentId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as VaultFolder[]
}

export async function getFolder(id: string): Promise<VaultFolder | null> {
  const { data, error } = await supabase
    .from("vault_folders")
    .select("id, org_id, name, is_system, parent_id, created_at")
    .eq("id", id)
    .single()

  if (error) return null
  return data as VaultFolder
}

export async function createFolder(
  orgId: string,
  name: string,
  parentId: string | null = null,
): Promise<VaultFolder> {
  const { data, error } = await supabase
    .from("vault_folders")
    .insert({ org_id: orgId, name: name.trim(), is_system: false, parent_id: parentId })
    .select("id, org_id, name, is_system, parent_id, created_at")
    .single()

  if (error) throw error
  return data as VaultFolder
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase.from("vault_folders").delete().eq("id", id)
  if (error) throw error
}
