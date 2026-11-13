import { and, eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createDb, type Tx } from "../src/db/client.js"
import {
  bills,
  documents,
  inboxItems,
  organizationMembers,
  transactionAttachments,
  transactionMatchSuggestions,
  transactions,
} from "../src/db/schema.js"
import type { Effects } from "../src/services/effects.js"
import * as svc from "../src/services/inbox.js"
import type { ServiceCtx } from "../src/services/invoices.js"

// Inbox services against the local Supabase Postgres. Every test runs in a
// transaction that is always rolled back — local data is never changed.

try {
  process.loadEnvFile(".env")
} catch {
  // no .env — skipped below
}

const url = process.env.DATABASE_URL
const ROLLBACK = new Error("rollback")

function fakeEffects(failProcessing = false) {
  const calls: { name: string; args: unknown[] }[] = []
  const effects = {
    removeVaultFiles: async (...args: unknown[]) => void calls.push({ name: "removeVaultFiles", args }),
    notifyInbox: async (...args: unknown[]) => void calls.push({ name: "notifyInbox", args }),
    processInboxItem: async (...args: unknown[]) => {
      calls.push({ name: "processInboxItem", args })
      if (failProcessing) throw new Error("trigger down")
    },
  } as unknown as Effects
  return { effects, calls }
}

describe.skipIf(!url)("inbox services (local database)", () => {
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

  async function scenario(
    body: (ctx: ServiceCtx, tx: Tx, calls: ReturnType<typeof fakeEffects>["calls"]) => Promise<void>,
    failProcessing = false,
  ) {
    const { effects, calls } = fakeEffects(failProcessing)
    await db
      .transaction(async (tx) => {
        await body({ db: tx, orgId, userId, today: "2026-11-13", timezone: "Africa/Nairobi", effects }, tx, calls)
        throw ROLLBACK
      })
      .catch((error) => {
        if (error !== ROLLBACK) throw error
      })
  }

  /** An inbox document, two candidate transactions and pending suggestions for both. */
  async function fixture(tx: Tx) {
    const path = `${orgId}/inbox/${crypto.randomUUID()}_receipt.pdf`
    const [item] = await tx
      .insert(inboxItems)
      .values({ orgId, fileName: "receipt.pdf", filePath: path, displayName: "INBTEST Naivas", contentType: "application/pdf", size: 1234, status: "suggested_match" })
      .returning()
    const tx1 = crypto.randomUUID()
    const tx2 = crypto.randomUUID()
    await tx.insert(transactions).values([
      { id: tx1, orgId, date: "2026-11-10", name: "INBTEST Naivas", amount: "500", currency: "KES", type: "expense", status: "completed" },
      { id: tx2, orgId, date: "2026-11-11", name: "INBTEST Carrefour", amount: "500", currency: "KES", type: "expense", status: "completed" },
    ])
    const [s1, s2] = await tx
      .insert(transactionMatchSuggestions)
      .values([
        { orgId, inboxItemId: item!.id, transactionId: tx1, status: "pending", matchType: "high_confidence" },
        { orgId, inboxItemId: item!.id, transactionId: tx2, status: "pending", matchType: "high_confidence" },
      ])
      .returning({ id: transactionMatchSuggestions.id })
    return { item: item!, path, tx1, tx2, s1: s1!.id, s2: s2!.id }
  }

  const suggestion = (tx: Tx, id: string) =>
    tx.select({ status: transactionMatchSuggestions.status }).from(transactionMatchSuggestions).where(eq(transactionMatchSuggestions.id, id)).then((r) => r[0]?.status)

  it("confirming attaches the file, marks the item done and notifies", async () => {
    await scenario(async (ctx, tx, calls) => {
      const f = await fixture(tx)
      const { item } = await svc.confirmSuggestion(ctx, f.s1)
      expect(item).toMatchObject({ status: "done", transactionId: f.tx1 })
      const [att] = await tx.select().from(transactionAttachments).where(eq(transactionAttachments.id, item.attachmentId!))
      expect(att).toMatchObject({ transactionId: f.tx1, filePath: f.path, fileName: "receipt.pdf", fileSize: 1234 })
      expect(await suggestion(tx, f.s1)).toBe("confirmed")
      expect(calls).toEqual([
        { name: "notifyInbox", args: ["inbox.match_confirmed", orgId, expect.objectContaining({ documentName: "INBTEST Naivas", transactionName: "INBTEST Naivas", inboxId: f.item.id })] },
      ])
      await expect(svc.confirmSuggestion(ctx, f.s1)).rejects.toMatchObject({ status: 409 })
      // Already matched elsewhere: unmatch first.
      await expect(svc.matchTransaction(ctx, f.item.id, f.tx2)).rejects.toMatchObject({ status: 409 })
    })
  })

  it("declining sends the item back to manual matching and expires the other suggestions", async () => {
    await scenario(async (ctx, tx) => {
      const f = await fixture(tx)
      const { item } = await svc.declineSuggestion(ctx, f.s1)
      expect(item.status).toBe("pending")
      expect(await suggestion(tx, f.s1)).toBe("declined")
      expect(await suggestion(tx, f.s2)).toBe("expired")
    })
  })

  it("matches by hand (recording the choice) and unmatches, keeping the file", async () => {
    await scenario(async (ctx, tx, calls) => {
      const f = await fixture(tx)
      await svc.declineSuggestion(ctx, f.s1)
      const { item } = await svc.matchTransaction(ctx, f.item.id, f.tx2)
      expect(item).toMatchObject({ status: "done", transactionId: f.tx2 })
      const recorded = await tx
        .select({ status: transactionMatchSuggestions.status, matchType: transactionMatchSuggestions.matchType })
        .from(transactionMatchSuggestions)
        .where(and(eq(transactionMatchSuggestions.inboxItemId, f.item.id), eq(transactionMatchSuggestions.transactionId, f.tx2), eq(transactionMatchSuggestions.status, "confirmed")))
      expect(recorded).toEqual([{ status: "confirmed", matchType: "suggested" }])

      const { item: after } = await svc.unmatchTransaction(ctx, f.item.id)
      expect(after).toMatchObject({ status: "pending", transactionId: null, attachmentId: null })
      expect(await tx.select().from(transactionAttachments).where(eq(transactionAttachments.transactionId, f.tx2))).toEqual([])
      expect(calls.filter((c) => c.name === "removeVaultFiles")).toEqual([])
    })
  })

  it("deletes documents with their Vault rows and bills, files after", async () => {
    await scenario(async (ctx, tx, calls) => {
      const f = await fixture(tx)
      await tx.insert(documents).values({ orgId, name: "receipt.pdf", filePath: f.path, source: "inbox" })
      await tx.insert(bills).values({ orgId, inboxItemId: f.item.id, source: "inbox", vendorName: "INBTEST Naivas", amount: "500", currency: "KES" })
      const { item: matched } = await svc.confirmSuggestion(ctx, f.s1)
      calls.length = 0
      expect(await svc.deleteInboxItems(ctx, [f.item.id])).toEqual({ deleted: 1 })
      expect(await tx.select().from(transactionAttachments).where(eq(transactionAttachments.id, matched.attachmentId!))).toEqual([])
      expect(await tx.select().from(inboxItems).where(eq(inboxItems.id, f.item.id))).toEqual([])
      expect(await tx.select().from(documents).where(eq(documents.filePath, f.path))).toEqual([])
      expect(await tx.select().from(bills).where(eq(bills.inboxItemId, f.item.id))).toEqual([])
      expect(calls).toEqual([{ name: "removeVaultFiles", args: [[f.path]] }])
    })
  })

  it("retries matching, and reports when it can't start", async () => {
    await scenario(async (ctx, tx, calls) => {
      const f = await fixture(tx)
      expect((await svc.retryMatching(ctx, f.item.id)).item.status).toBe("analyzing")
      expect(calls).toEqual([{ name: "processInboxItem", args: [f.item.id] }])
    })
    await scenario(async (ctx, tx) => {
      const f = await fixture(tx)
      await expect(svc.retryMatching(ctx, f.item.id)).rejects.toMatchObject({ status: 502 })
    }, true)
  })

  it("blocks a sender once", async () => {
    await scenario(async (ctx) => {
      const { entry } = await svc.addBlocklistEntry(ctx, "domain", "inbtest-spam.example")
      await expect(svc.addBlocklistEntry(ctx, "domain", "inbtest-spam.example")).rejects.toMatchObject({ status: 409 })
      await svc.removeBlocklistEntry(ctx, entry.id)
    })
  })

  it("only sees the caller's organisation", async () => {
    await scenario(async (ctx, tx) => {
      const f = await fixture(tx)
      const other = { ...ctx, orgId: crypto.randomUUID() }
      await expect(svc.confirmSuggestion(other, f.s1)).rejects.toMatchObject({ status: 404 })
      await expect(svc.matchTransaction(other, f.item.id, f.tx1)).rejects.toMatchObject({ status: 404 })
      await expect(svc.deleteInboxItems(other, [f.item.id])).rejects.toMatchObject({ status: 404 })
      // Own document, someone else's transaction:
      await expect(svc.matchTransaction(ctx, f.item.id, crypto.randomUUID())).rejects.toMatchObject({ status: 422 })
    })
  })
})
