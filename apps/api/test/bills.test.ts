import { eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createDb, type Tx } from "../src/db/client.js"
import { bills, inboxItems, organizationMembers } from "../src/db/schema.js"
import { createBillSchema } from "../src/services/bill-schemas.js"
import * as svc from "../src/services/bills.js"
import type { Effects } from "../src/services/effects.js"
import type { ServiceCtx } from "../src/services/invoices.js"

// Bill services against the local Supabase Postgres. Every test runs in a
// transaction that is always rolled back — local data is never changed.

try {
  process.loadEnvFile(".env")
} catch {
  // no .env — skipped below
}

const url = process.env.DATABASE_URL
const ROLLBACK = new Error("rollback")

describe.skipIf(!url)("bill services (local database)", () => {
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

  async function scenario(body: (ctx: ServiceCtx, tx: Tx) => Promise<void>) {
    await db
      .transaction(async (tx) => {
        await body({ db: tx, orgId, userId, today: "2026-11-13", timezone: "Africa/Nairobi", effects: {} as Effects }, tx)
        throw ROLLBACK
      })
      .catch((error) => {
        if (error !== ROLLBACK) throw error
      })
  }

  const input = (over: Record<string, unknown> = {}) =>
    createBillSchema.parse({ vendor_name: "BLTEST KPLC", amount: 5000, currency: "kes", due_date: "2026-12-01", bill_number: "", ...over })

  it("creates, edits, marks paid on the user's day and unpaid again, then deletes", async () => {
    await scenario(async (ctx, tx) => {
      const { bill } = await svc.createBill(ctx, input())
      expect(bill).toMatchObject({ orgId, createdBy: userId, source: "manual", status: "unpaid", currency: "KES", billNumber: null })

      expect((await svc.updateBill(ctx, bill.id, { amount: 5500, note: "tokens" })).bill).toMatchObject({ amount: "5500", note: "tokens", vendorName: "BLTEST KPLC" })
      expect((await svc.setBillPaid(ctx, bill.id, true)).bill).toMatchObject({ status: "paid", paidAt: "2026-11-13" })
      expect((await svc.setBillPaid(ctx, bill.id, true, "2026-11-01")).bill.paidAt).toBe("2026-11-01")
      expect((await svc.setBillPaid(ctx, bill.id, false)).bill).toMatchObject({ status: "unpaid", paidAt: null })

      await svc.deleteBill(ctx, bill.id)
      expect(await tx.select().from(bills).where(eq(bills.id, bill.id))).toEqual([])
    })
  })

  it("makes a bill from an inbox document, once", async () => {
    await scenario(async (ctx, tx) => {
      const [item] = await tx
        .insert(inboxItems)
        .values({ orgId, fileName: "kplc.pdf", filePath: `${orgId}/inbox/kplc.pdf`, displayName: "BLTEST KPLC", amount: "1234", currency: "KES", date: "2026-11-02", invoiceNumber: "K-9" })
        .returning({ id: inboxItems.id })
      const { bill } = await svc.createBillFromInboxItem(ctx, item!.id)
      expect(bill).toMatchObject({ source: "inbox", inboxItemId: item!.id, vendorName: "BLTEST KPLC", billNumber: "K-9", status: "unpaid", issueDate: "2026-11-02" })
      expect(Number(bill.amount)).toBe(1234)
      await expect(svc.createBillFromInboxItem(ctx, item!.id)).rejects.toMatchObject({ status: 409 })

      const [noAmount] = await tx
        .insert(inboxItems)
        .values({ orgId, fileName: "x.pdf", filePath: `${orgId}/inbox/x.pdf` })
        .returning({ id: inboxItems.id })
      await expect(svc.createBillFromInboxItem(ctx, noAmount!.id)).rejects.toMatchObject({ status: 422 })
    })
  })

  it("rejects bad input and only sees the caller's organisation", async () => {
    await scenario(async (ctx) => {
      expect(createBillSchema.safeParse({ vendor_name: " ", amount: 1, currency: "KES" }).success).toBe(false)
      const { bill } = await svc.createBill(ctx, input())
      const other = { ...ctx, orgId: crypto.randomUUID() }
      await expect(svc.updateBill(other, bill.id, { note: "x" })).rejects.toMatchObject({ status: 404 })
      await expect(svc.setBillPaid(other, bill.id, true)).rejects.toMatchObject({ status: 404 })
      await expect(svc.deleteBill(other, bill.id)).rejects.toMatchObject({ status: 404 })
      await expect(svc.createBillFromInboxItem(other, crypto.randomUUID())).rejects.toMatchObject({ status: 404 })
    })
  })
})
