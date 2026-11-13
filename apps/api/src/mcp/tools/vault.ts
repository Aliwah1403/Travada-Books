import { z } from "zod"
import { defineTool, ToolError } from "../types.js"
import { must, uuid } from "../util.js"

// Vault writes for the assistant (ASSISTANT-PLAN §5), on the same services as
// the app's /v1/vault routes. documents_list (reports.ts) finds documents.

type DocRef = { id: string; name: string; file_path: string }

async function loadDocs(ids: string[], ctx: Parameters<Parameters<typeof defineTool>[0]["run"]>[1]) {
  const rows = must(await ctx.db.select("documents", "id, name, file_path").in("id", ids), "Documents") as DocRef[]
  if (rows.length === 0) throw new ToolError("None of those documents were found")
  return rows
}

const docsLabel = (rows: DocRef[]) => (rows.length === 1 ? `"${rows[0]!.name}"` : `${rows.length} documents`)

export const vaultWriteTools = [
  defineTool({
    name: "documents_tag",
    title: "Tag document",
    description: "Add a tag to a vault document (the tag is created if it doesn't exist yet).",
    kind: "write",
    input: { document_id: uuid("Document"), tag: z.string().min(1).max(60) },
    run: async ({ document_id, tag }, ctx) => {
      const { tag: saved } = await ctx.vault.addTag(document_id, tag)
      return { data: { document_id, tag: saved.name }, entity: { type: "document", id: document_id }, summary: `Tagged a document "${saved.name}"` }
    },
  }),

  defineTool({
    name: "documents_move",
    title: "Move documents",
    description: "Move vault documents into a folder (folder_id from the vault), or to the top level with folder_id null.",
    kind: "write",
    input: { document_ids: z.array(z.uuid()).min(1).max(50), folder_id: uuid("Folder").nullable() },
    run: async ({ document_ids, folder_id }, ctx) => {
      const rows = await loadDocs(document_ids, ctx)
      const { moved } = await ctx.vault.move(rows.map((r) => r.file_path), folder_id)
      return { data: { moved }, summary: `Moved ${docsLabel(rows)} ${folder_id ? "into a folder" : "to the top level"}`, entity: rows.length === 1 ? { type: "document", id: rows[0]!.id } : undefined }
    },
  }),

  defineTool({
    name: "documents_link_transaction",
    title: "Attach documents to transaction",
    description: "Attach vault documents (receipts, invoices) to a transaction as its supporting documents.",
    kind: "write",
    input: { document_ids: z.array(z.uuid()).min(1).max(20), transaction_id: uuid("Transaction") },
    run: async ({ document_ids, transaction_id }, ctx) => {
      const rows = await loadDocs(document_ids, ctx)
      const { linked } = await ctx.vault.link(document_ids, transaction_id)
      return { data: { linked }, entity: { type: "transaction", id: transaction_id }, summary: `Attached ${docsLabel(rows)} to a transaction` }
    },
  }),

  defineTool({
    name: "folders_create",
    title: "Create vault folder",
    description: "Create a folder in the document vault, optionally inside another folder.",
    kind: "write",
    input: { name: z.string().min(1).max(100), parent_id: uuid("Parent folder").optional() },
    run: async ({ name, parent_id }, ctx) => {
      const { folder } = await ctx.vault.createFolder(name, parent_id ?? null)
      return { data: { id: folder.id, name: folder.name }, entity: { type: "folder", id: folder.id }, summary: `Created folder "${folder.name}"` }
    },
  }),

  defineTool({
    name: "documents_delete",
    title: "Delete documents",
    description: "Permanently delete vault documents (up to 50) and their files.",
    kind: "destructive",
    confirm: true,
    input: { document_ids: z.array(z.uuid()).min(1).max(50) },
    describe: async ({ document_ids }, ctx) => {
      const rows = await loadDocs(document_ids, ctx)
      return `Permanently delete ${docsLabel(rows)} and the file${rows.length === 1 ? "" : "s"}? This can't be undone.`
    },
    run: async ({ document_ids }, ctx) => {
      const { deleted } = await ctx.vault.remove(document_ids)
      return { data: { deleted }, summary: `Deleted ${deleted} document${deleted === 1 ? "" : "s"}` }
    },
  }),
]
