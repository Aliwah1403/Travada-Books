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

export type DocumentTag = {
  id: string
  name: string
  slug: string
}

export type VaultDocument = {
  id: string
  org_id: string
  created_by: string | null
  name: string
  title: string | null
  file_path: string
  file_size: number | null
  content_type: string | null
  source: "upload" | "transaction" | "inbox"
  transaction_id: string | null
  folder_id: string | null
  tags: DocumentTag[] | null
  summary: string | null
  processing_status: "pending" | "processing" | "completed" | "failed"
  created_at: string
}

// Raw shape returned by Supabase before we flatten the tag join
type RawVaultDocument = Omit<VaultDocument, "tags"> & {
  document_tag_assignments: { tag_id: string; document_tags: DocumentTag }[]
}

const DOCUMENT_SELECT =
  "id, org_id, created_by, name, title, file_path, file_size, content_type, source, transaction_id, folder_id, summary, processing_status, created_at, document_tag_assignments(tag_id, document_tags(id, name, slug))"

function normalizeDoc(raw: RawVaultDocument): VaultDocument {
  return {
    ...raw,
    tags: raw.document_tag_assignments?.map((a) => a.document_tags).filter(Boolean) ?? null,
  }
}

export type VaultFilters = {
  source?: "upload" | "transaction" | "inbox"
  search?: string
  folderId?: string
  dateFrom?: string
  dateTo?: string
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function getDocument(id: string): Promise<VaultDocument | null> {
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_SELECT)
    .eq("id", id)
    .single()
  if (error) return null
  return normalizeDoc(data as RawVaultDocument)
}

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
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom)
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo + "T23:59:59")

  const { data, error } = await query
  if (error) throw error
  return (data as RawVaultDocument[] ?? []).map(normalizeDoc)
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
  return (data as RawVaultDocument[] ?? []).map(normalizeDoc)
}

export async function updateDocument(
  id: string,
  patch: { summary?: string | null; folder_id?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

// ─── Document tags ────────────────────────────────────────────────────────────

export async function listDocumentTags(orgId: string): Promise<DocumentTag[]> {
  const { data, error } = await supabase
    .from("document_tags")
    .select("id, name, slug")
    .eq("org_id", orgId)
    .order("name")
  if (error) throw error
  return (data ?? []) as DocumentTag[]
}

export async function upsertDocumentTag(orgId: string, name: string): Promise<DocumentTag> {
  const trimmed = name.trim()
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")
  const { data, error } = await supabase
    .from("document_tags")
    .upsert({ org_id: orgId, name: trimmed, slug }, { onConflict: "org_id,slug" })
    .select("id, name, slug")
    .single()
  if (error) throw error
  return data as DocumentTag
}

export async function addDocumentTagAssignment(documentId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from("document_tag_assignments")
    .insert({ document_id: documentId, tag_id: tagId })
  if (error) throw error
}

export async function removeDocumentTagAssignment(documentId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from("document_tag_assignments")
    .delete()
    .eq("document_id", documentId)
    .eq("tag_id", tagId)
  if (error) throw error
}

export async function linkDocumentsToTransaction(
  docs: Pick<VaultDocument, "id" | "file_path" | "name" | "file_size" | "content_type" | "org_id">[],
  transactionId: string,
): Promise<void> {
  const { error: docError } = await supabase
    .from("documents")
    .update({ transaction_id: transactionId, source: "transaction", updated_at: new Date().toISOString() })
    .in("id", docs.map((d) => d.id))
  if (docError) throw docError

  const { error: attError } = await supabase
    .from("transaction_attachments")
    .insert(
      docs.map((doc) => ({
        transaction_id: transactionId,
        org_id: doc.org_id,
        file_path: doc.file_path,
        file_name: doc.name,
        file_size: doc.file_size,
        content_type: doc.content_type,
      })),
    )
  if (attError) throw attError
}

export async function setDocumentFolder(filePath: string, folderId: string | null): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({ folder_id: folderId, updated_at: new Date().toISOString() })
    .eq("file_path", filePath)
  if (error) throw error
}

// ─── Document shares ──────────────────────────────────────────────────────────

export type DocumentShareInfo = {
  signedUrl: string
  fileName: string | null
  fileSize: number | null
  contentType: string | null
  expiresAt: string
  orgName: string | null
}

export async function createDocumentShare(documentId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("create-document-share", {
    body: { documentId },
  })
  if (error) throw error
  if (!data?.token) throw new Error("No token returned")
  return data.token as string
}

export async function getDocumentShare(token: string): Promise<DocumentShareInfo> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  const res = await fetch(
    `${supabaseUrl}/functions/v1/get-document-share?token=${encodeURIComponent(token)}`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
  )
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? "Failed to load share")
  return json as DocumentShareInfo
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
): Promise<string> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${orgId}/upload/${Date.now()}_${safe}`

  const { error: storageError } = await supabase.storage
    .from("vault")
    .upload(path, file, { upsert: false })

  if (storageError) throw storageError

  // Set clean display name (storage path keeps timestamp for uniqueness, display name does not)
  const patch: Record<string, unknown> = { name: file.name.trim() }
  if (folderId) patch.folder_id = folderId
  await supabase.from("documents").update(patch).eq("file_path", path)

  return path
}

export async function uploadFileForImport(orgId: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${orgId}/imports/${Date.now()}_${safe}`
  const { error } = await supabase.storage.from("vault").upload(path, file, { upsert: false })
  if (error) throw error
  return path
}

export const uploadCsvForImport = uploadFileForImport

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
