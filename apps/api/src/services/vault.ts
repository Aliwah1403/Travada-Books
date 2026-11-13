import { and, eq, inArray } from "drizzle-orm"
import { inOrg } from "../db/client.js"
import { documentTagAssignments, documentTags, documents, transactionAttachments, transactions, vaultFolders } from "../db/schema.js"
import { mapDbError, ServiceError } from "../lib/errors.js"
import { followUp, type ServiceCtx } from "./invoices.js"
import type { UpdateDocumentInput } from "./vault-schemas.js"

// Vault writes (API-WRITES-PLAN.md §6, domain 6c). The /v1/vault routes (the
// app) and the assistant's tools both call these. Uploading files and share
// links stay where they are (storage upload; create-document-share).

type Ctx = Pick<ServiceCtx, "db" | "orgId">

const now = () => new Date().toISOString()

export async function getDocumentRow(ctx: Ctx, id: string) {
  const [row] = await ctx.db.select().from(documents).where(inOrg(documents, ctx.orgId, eq(documents.id, id))).limit(1)
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Document not found.")
  return row
}

export type DocumentRow = Awaited<ReturnType<typeof getDocumentRow>>

async function assertFolder(ctx: Ctx, folderId: string | null | undefined, field = "folder_id") {
  if (!folderId) return
  const [row] = await ctx.db.select({ id: vaultFolders.id }).from(vaultFolders).where(inOrg(vaultFolders, ctx.orgId, eq(vaultFolders.id, folderId))).limit(1)
  if (!row) throw new ServiceError(422, "VALIDATION_FAILED", "Folder not found.", field)
}

/** Delete documents; their files are removed after commit (best-effort). */
export async function deleteDocuments(ctx: ServiceCtx, ids: string[]) {
  const rows = await ctx.db
    .delete(documents)
    .where(inOrg(documents, ctx.orgId, inArray(documents.id, ids)))
    .returning({ id: documents.id, filePath: documents.filePath })
  if (rows.length === 0) throw new ServiceError(404, "NOT_FOUND", ids.length === 1 ? "Document not found." : "None of those documents were found.")
  await followUp(() => ctx.effects.removeVaultFiles(rows.map((r) => r.filePath)))
  return { deleted: rows.length }
}

/** Rename, edit the summary or move to a folder. */
export async function updateDocument(ctx: ServiceCtx, id: string, input: UpdateDocumentInput) {
  await assertFolder(ctx, input.folder_id)
  const values: Partial<typeof documents.$inferInsert> = {}
  if (input.name !== undefined) values.name = input.name
  if (input.summary !== undefined) values.summary = input.summary || null
  if (input.folder_id !== undefined) values.folderId = input.folder_id
  if (Object.keys(values).length === 0) return { document: await getDocumentRow(ctx, id) }
  const [row] = await ctx.db
    .update(documents)
    .set({ ...values, updatedAt: now() })
    .where(inOrg(documents, ctx.orgId, eq(documents.id, id)))
    .returning()
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Document not found.")
  return { document: row }
}

/** Move documents (by storage path, as the app selects them) into a folder, or to the top level. */
export async function moveDocuments(ctx: ServiceCtx, filePaths: string[], folderId: string | null) {
  await assertFolder(ctx, folderId)
  const rows = await ctx.db
    .update(documents)
    .set({ folderId, updatedAt: now() })
    .where(inOrg(documents, ctx.orgId, inArray(documents.filePath, filePaths)))
    .returning({ id: documents.id })
  if (rows.length === 0) throw new ServiceError(404, "NOT_FOUND", "None of those documents were found.")
  return { moved: rows.length }
}

const slugify = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")

/** Tag a document, creating the tag if the organisation doesn't have it yet. */
export async function addTag(ctx: ServiceCtx, documentId: string, name: string) {
  await getDocumentRow(ctx, documentId)
  const slug = slugify(name)
  if (!slug) throw new ServiceError(422, "VALIDATION_FAILED", "Use letters or numbers in the tag.", "name")
  return ctx.db.transaction(async (tx) => {
    const [tag] = await tx
      .insert(documentTags)
      .values({ orgId: ctx.orgId, name: name.trim(), slug })
      .onConflictDoUpdate({ target: [documentTags.orgId, documentTags.slug], set: { name: name.trim() } })
      .returning({ id: documentTags.id, name: documentTags.name, slug: documentTags.slug })
    await tx.insert(documentTagAssignments).values({ documentId, tagId: tag!.id }).onConflictDoNothing()
    return { tag: tag! }
  })
}

export async function removeTag(ctx: ServiceCtx, documentId: string, tagId: string) {
  await getDocumentRow(ctx, documentId)
  await ctx.db
    .delete(documentTagAssignments)
    .where(and(eq(documentTagAssignments.documentId, documentId), eq(documentTagAssignments.tagId, tagId)))
  return { removed: true }
}

/**
 * File documents under a transaction: they become its attachments (pointing
 * at the same stored file, not a copy) and show as transaction documents.
 */
export async function linkDocumentsToTransaction(ctx: ServiceCtx, ids: string[], transactionId: string) {
  const [txRow] = await ctx.db
    .select({ id: transactions.id })
    .from(transactions)
    .where(inOrg(transactions, ctx.orgId, eq(transactions.id, transactionId)))
    .limit(1)
  if (!txRow) throw new ServiceError(422, "VALIDATION_FAILED", "Transaction not found.", "transaction_id")
  const docs = await ctx.db.select().from(documents).where(inOrg(documents, ctx.orgId, inArray(documents.id, ids)))
  if (docs.length !== ids.length) throw new ServiceError(404, "NOT_FOUND", "Some of those documents were not found.")

  await ctx.db.transaction(async (tx) => {
    await tx
      .update(documents)
      .set({ transactionId, source: "transaction", updatedAt: now() })
      .where(inOrg(documents, ctx.orgId, inArray(documents.id, ids)))
    await tx.insert(transactionAttachments).values(
      docs.map((d) => ({
        transactionId,
        orgId: ctx.orgId,
        filePath: d.filePath,
        fileName: d.name,
        fileSize: d.fileSize,
        contentType: d.contentType,
      })),
    )
  })
  return { linked: docs.length }
}

// ─── Folders ────────────────────────────────────────────────────────────────

export async function createFolder(ctx: ServiceCtx, name: string, parentId: string | null) {
  await assertFolder(ctx, parentId, "parent_id")
  try {
    const [row] = await ctx.db.transaction((tx) =>
      tx.insert(vaultFolders).values({ orgId: ctx.orgId, name, isSystem: false, parentId }).returning(),
    )
    return { folder: row! }
  } catch (error) {
    throw mapDbError(error)
  }
}

/** Delete a folder you made. Its subfolders go too; documents in them move to the top level. */
export async function deleteFolder(ctx: ServiceCtx, id: string) {
  const [folder] = await ctx.db.select().from(vaultFolders).where(inOrg(vaultFolders, ctx.orgId, eq(vaultFolders.id, id))).limit(1)
  if (!folder) throw new ServiceError(404, "NOT_FOUND", "Folder not found.")
  if (folder.isSystem) throw new ServiceError(403, "FORBIDDEN", "Built-in folders can't be deleted.")
  await ctx.db.delete(vaultFolders).where(inOrg(vaultFolders, ctx.orgId, eq(vaultFolders.id, id)))
  return { folder }
}

export function vaultServices(ctx: ServiceCtx) {
  return {
    get: (id: string) => getDocumentRow(ctx, id),
    remove: (ids: string[]) => deleteDocuments(ctx, ids),
    update: (id: string, input: UpdateDocumentInput) => updateDocument(ctx, id, input),
    move: (filePaths: string[], folderId: string | null) => moveDocuments(ctx, filePaths, folderId),
    addTag: (documentId: string, name: string) => addTag(ctx, documentId, name),
    link: (ids: string[], transactionId: string) => linkDocumentsToTransaction(ctx, ids, transactionId),
    createFolder: (name: string, parentId: string | null) => createFolder(ctx, name, parentId),
  }
}

export type VaultServices = ReturnType<typeof vaultServices>
