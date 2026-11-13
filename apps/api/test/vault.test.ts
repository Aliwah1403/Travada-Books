import { and, eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createDb, type Tx } from "../src/db/client.js"
import { documentTagAssignments, documentTags, documents, organizationMembers, transactionAttachments, transactions, vaultFolders } from "../src/db/schema.js"
import type { Effects } from "../src/services/effects.js"
import type { ServiceCtx } from "../src/services/invoices.js"
import * as svc from "../src/services/vault.js"

// Vault services against the local Supabase Postgres. Every test runs in a
// transaction that is always rolled back — local data is never changed.

try {
  process.loadEnvFile(".env")
} catch {
  // no .env — skipped below
}

const url = process.env.DATABASE_URL
const ROLLBACK = new Error("rollback")

describe.skipIf(!url)("vault services (local database)", () => {
  const { db, close } = createDb(url ?? "")
  let orgId = ""
  let userId = ""
  afterAll(() => close())

  beforeAll(async () => {
    const [member] = await db
      .select({ orgId: organizationMembers.orgId, userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(eq(organizationMembers.status, "active"))
      .limit(1)
    orgId = member!.orgId
    userId = member!.userId!
  })

  async function scenario(body: (ctx: ServiceCtx, tx: Tx, calls: { name: string; args: unknown[] }[]) => Promise<void>) {
    const calls: { name: string; args: unknown[] }[] = []
    const effects = { removeVaultFiles: async (...args: unknown[]) => void calls.push({ name: "removeVaultFiles", args }) } as unknown as Effects
    await db
      .transaction(async (tx) => {
        await body({ db: tx, orgId, userId, today: "2026-11-13", timezone: "Africa/Nairobi", effects }, tx, calls)
        throw ROLLBACK
      })
      .catch((error) => {
        if (error !== ROLLBACK) throw error
      })
  }

  async function doc(tx: Tx, name = "VTEST receipt.pdf") {
    const [row] = await tx
      .insert(documents)
      .values({ orgId, name, filePath: `${orgId}/uploads/${crypto.randomUUID()}.pdf`, contentType: "application/pdf", fileSize: 10 })
      .returning()
    return row!
  }

  it("renames, summarises and moves; refuses another org's folder", async () => {
    await scenario(async (ctx, tx) => {
      const d = await doc(tx)
      const { folder } = await svc.createFolder(ctx, "VTEST Receipts", null)
      const { folder: child } = await svc.createFolder(ctx, "VTEST 2026", folder.id)
      expect(child.parentId).toBe(folder.id)

      expect((await svc.updateDocument(ctx, d.id, { name: "VTEST renamed.pdf", summary: "" })).document).toMatchObject({ name: "VTEST renamed.pdf", summary: null })
      expect(await svc.moveDocuments(ctx, [d.filePath], child.id)).toEqual({ moved: 1 })
      expect((await svc.getDocumentRow(ctx, d.id)).folderId).toBe(child.id)
      await expect(svc.moveDocuments(ctx, [d.filePath], crypto.randomUUID())).rejects.toMatchObject({ status: 422 })

      // Deleting the parent removes the child folder; the document moves to the top level.
      await svc.deleteFolder(ctx, folder.id)
      expect(await tx.select().from(vaultFolders).where(eq(vaultFolders.id, child.id))).toEqual([])
      expect((await svc.getDocumentRow(ctx, d.id)).folderId).toBeNull()
    })
  })

  it("tags (reusing the tag by name) and untags", async () => {
    await scenario(async (ctx, tx) => {
      const a = await doc(tx)
      const b = await doc(tx, "VTEST other.pdf")
      const { tag } = await svc.addTag(ctx, a.id, "VTEST Tax 2026")
      const { tag: again } = await svc.addTag(ctx, b.id, "vtest tax 2026")
      expect(again.id).toBe(tag.id)
      await svc.addTag(ctx, a.id, "VTEST Tax 2026") // already tagged: no error
      expect(await tx.select().from(documentTagAssignments).where(eq(documentTagAssignments.tagId, tag.id))).toHaveLength(2)
      await svc.removeTag(ctx, a.id, tag.id)
      expect(await tx.select().from(documentTagAssignments).where(and(eq(documentTagAssignments.documentId, a.id), eq(documentTagAssignments.tagId, tag.id)))).toEqual([])
      expect(await tx.select().from(documentTags).where(eq(documentTags.id, tag.id))).toHaveLength(1)
    })
  })

  it("attaches documents to a transaction without copying the file", async () => {
    await scenario(async (ctx, tx) => {
      const d = await doc(tx)
      const [t] = await tx
        .insert(transactions)
        .values({ orgId, date: "2026-11-10", name: "VTEST", amount: "1", currency: "KES", type: "expense", status: "completed" })
        .returning({ id: transactions.id })
      expect(await svc.linkDocumentsToTransaction(ctx, [d.id], t!.id)).toEqual({ linked: 1 })
      expect((await svc.getDocumentRow(ctx, d.id))).toMatchObject({ transactionId: t!.id, source: "transaction" })
      const [att] = await tx.select().from(transactionAttachments).where(eq(transactionAttachments.transactionId, t!.id))
      expect(att).toMatchObject({ filePath: d.filePath, fileName: d.name })
      await expect(svc.linkDocumentsToTransaction(ctx, [d.id], crypto.randomUUID())).rejects.toMatchObject({ status: 422 })
    })
  })

  it("keeps the file when a transaction still uses it; only the Vault entry goes", async () => {
    await scenario(async (ctx, tx, calls) => {
      const d = await doc(tx)
      const [t] = await tx
        .insert(transactions)
        .values({ orgId, date: "2026-11-10", name: "VTEST", amount: "1", currency: "KES", type: "expense", status: "completed" })
        .returning({ id: transactions.id })
      await svc.linkDocumentsToTransaction(ctx, [d.id], t!.id)
      expect(await svc.deleteDocuments(ctx, [d.id])).toEqual({ deleted: 1, filesKept: 1 })
      expect(calls).toEqual([])
      expect(await tx.select().from(transactionAttachments).where(eq(transactionAttachments.transactionId, t!.id))).toHaveLength(1)
    })
  })

  it("deletes documents, files after; refuses built-in folders and other orgs", async () => {
    await scenario(async (ctx, tx, calls) => {
      const a = await doc(tx)
      const b = await doc(tx)
      expect(await svc.deleteDocuments(ctx, [a.id, b.id])).toEqual({ deleted: 2, filesKept: 0 })
      expect(calls).toEqual([{ name: "removeVaultFiles", args: [expect.arrayContaining([a.filePath, b.filePath])] }])

      const [system] = await tx.insert(vaultFolders).values({ orgId, name: "VTEST system", isSystem: true }).returning()
      await expect(svc.deleteFolder(ctx, system!.id)).rejects.toMatchObject({ status: 403 })

      const c = await doc(tx)
      const other = { ...ctx, orgId: crypto.randomUUID() }
      await expect(svc.deleteDocuments(other, [c.id])).rejects.toMatchObject({ status: 404 })
      await expect(svc.updateDocument(other, c.id, { name: "x" })).rejects.toMatchObject({ status: 404 })
      await expect(svc.addTag(other, c.id, "x")).rejects.toMatchObject({ status: 404 })
      await expect(svc.moveDocuments(other, [c.filePath], null)).rejects.toMatchObject({ status: 404 })
    })
  })
})
