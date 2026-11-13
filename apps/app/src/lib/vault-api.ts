import { api, unwrap } from "@/lib/api";
import { apiWritesEnabled } from "@/lib/api-flags";
import {
  addDocumentTagAssignment,
  bulkDeleteDocuments,
  bulkSetDocumentFolder,
  createFolder,
  deleteDocument,
  deleteFolder,
  linkDocumentsToTransaction,
  removeDocumentTagAssignment,
  renameDocument,
  setDocumentFolder,
  updateDocument,
  upsertDocumentTag,
  type DocumentTag,
  type VaultDocument,
  type VaultFolder,
} from "@/lib/queries/vault";

// Vault writes (API-WRITES-PLAN.md domain 6c). Each goes through /v1/vault
// when apiWritesEnabled("vault") is on and the direct Supabase write when
// it's off. Uploads and share links stay where they are.

/** A fresh key per user action, so a retried request can't run twice. */
const idem = () => ({ headers: { "Idempotency-Key": crypto.randomUUID() } });
const viaApi = () => apiWritesEnabled("vault");
const docs = () => api.v1.vault.documents;

export const vaultWrites = {
  async remove(id: string, filePath: string): Promise<void> {
    if (!viaApi()) return deleteDocument(id, filePath);
    await unwrap(docs().delete.$post({ json: { ids: [id] } }, idem()));
  },

  async bulkRemove(items: { id: string; file_path: string }[]): Promise<void> {
    if (!viaApi()) return bulkDeleteDocuments(items);
    await unwrap(docs().delete.$post({ json: { ids: items.map((d) => d.id) } }, idem()));
  },

  async update(id: string, patch: { summary?: string | null; folder_id?: string | null }): Promise<void> {
    if (!viaApi()) return updateDocument(id, patch);
    await unwrap(docs()[":id"].$patch({ param: { id }, json: patch }, idem()));
  },

  async rename(id: string, name: string): Promise<void> {
    if (!viaApi()) return renameDocument(id, name);
    await unwrap(docs()[":id"].$patch({ param: { id }, json: { name } }, idem()));
  },

  async setFolder(filePath: string, folderId: string | null): Promise<void> {
    if (!viaApi()) return setDocumentFolder(filePath, folderId);
    await unwrap(docs().move.$post({ json: { file_paths: [filePath], folder_id: folderId } }, idem()));
  },

  async bulkSetFolder(filePaths: string[], folderId: string | null): Promise<void> {
    if (!viaApi()) return bulkSetDocumentFolder(filePaths, folderId);
    await unwrap(docs().move.$post({ json: { file_paths: filePaths, folder_id: folderId } }, idem()));
  },

  /** Tag a document, creating the tag if needed. */
  async addTag(orgId: string, documentId: string, name: string): Promise<DocumentTag> {
    if (!viaApi()) {
      const tag = await upsertDocumentTag(orgId, name);
      await addDocumentTagAssignment(documentId, tag.id);
      return tag;
    }
    return (await unwrap(docs()[":id"].tags.$post({ param: { id: documentId }, json: { name } }, idem()))).tag;
  },

  async removeTag(documentId: string, tagId: string): Promise<void> {
    if (!viaApi()) return removeDocumentTagAssignment(documentId, tagId);
    await unwrap(docs()[":id"].tags[":tagId"].$delete({ param: { id: documentId, tagId } }));
  },

  async linkToTransaction(
    items: Pick<VaultDocument, "id" | "file_path" | "name" | "file_size" | "content_type" | "org_id">[],
    transactionId: string,
  ): Promise<void> {
    if (!viaApi()) return linkDocumentsToTransaction(items, transactionId);
    await unwrap(docs().link.$post({ json: { ids: items.map((d) => d.id), transaction_id: transactionId } }, idem()));
  },

  async createFolder(orgId: string, name: string, parentId: string | null = null): Promise<VaultFolder> {
    if (!viaApi()) return createFolder(orgId, name, parentId);
    return (await unwrap(api.v1.vault.folders.$post({ json: { name, parent_id: parentId } }, idem()))).folder as VaultFolder;
  },

  async deleteFolder(id: string): Promise<void> {
    if (!viaApi()) return deleteFolder(id);
    await unwrap(api.v1.vault.folders[":id"].$delete({ param: { id } }));
  },
};
