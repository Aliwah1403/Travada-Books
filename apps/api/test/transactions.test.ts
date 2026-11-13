import { and, eq, ne } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createDb, type Tx } from "../src/db/client.js"
import {
  exchangeRates,
  invoicePayments,
  inboxItems,
  invoices,
  organizationMembers,
  organizations,
  transactionAttachments,
  transactionCategories,
  transactions,
} from "../src/db/schema.js"
import type { Effects } from "../src/services/effects.js"
import type { ServiceCtx } from "../src/services/invoices.js"
import { createCategoryRuleSchema, createTransactionSchema } from "../src/services/transaction-schemas.js"
import * as svc from "../src/services/transactions.js"

// Transaction services against the local Supabase Postgres. Every test runs
// in a transaction that is always rolled back — local data is never changed.

try {
  process.loadEnvFile(".env")
} catch {
  // no .env — skipped below
}

const url = process.env.DATABASE_URL
const ROLLBACK = new Error("rollback")

function fakeEffects() {
  const calls: { name: string; args: unknown[] }[] = []
  const effects = {
    removeVaultFiles: async (...args: unknown[]) => void calls.push({ name: "removeVaultFiles", args }),
    enrichTransactions: async (...args: unknown[]) => void calls.push({ name: "enrichTransactions", args }),
  } as unknown as Effects
  return { effects, calls }
}

describe.skipIf(!url)("transaction services (local database)", () => {
  const { db, close } = createDb(url ?? "")
  let orgId = ""
  let userId = ""
  let base = ""
  let foreign: { currency: string; rate: number } | null = null
  afterAll(() => close())

  beforeAll(async () => {
    const [member] = await db
      .select({ orgId: organizationMembers.orgId, userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(eq(organizationMembers.status, "active"))
      .limit(1)
    orgId = member!.orgId
    userId = member!.userId!
    const [org] = await db.select({ base: organizations.baseCurrency }).from(organizations).where(eq(organizations.id, orgId))
    base = org!.base
    const [rate] = await db
      .select({ currency: exchangeRates.base, rate: exchangeRates.rate })
      .from(exchangeRates)
      .where(and(eq(exchangeRates.target, base), ne(exchangeRates.base, base)))
      .limit(1)
    foreign = rate ? { currency: rate.currency, rate: Number(rate.rate) } : null
  })

  async function scenario(body: (ctx: ServiceCtx, tx: Tx, calls: ReturnType<typeof fakeEffects>["calls"]) => Promise<void>) {
    const { effects, calls } = fakeEffects()
    await db
      .transaction(async (tx) => {
        await body({ db: tx, orgId, userId, today: "2026-11-12", timezone: "Africa/Nairobi", effects }, tx, calls)
        throw ROLLBACK
      })
      .catch((error) => {
        if (error !== ROLLBACK) throw error
      })
  }

  const input = (over: Record<string, unknown> = {}) =>
    createTransactionSchema.parse({ date: "2026-11-10", name: "TXTEST office chairs", amount: 1500, currency: base, type: "expense", ...over })

  it("creates a manual transaction in the base currency and queues enrichment", async () => {
    await scenario(async (ctx, _tx, calls) => {
      const { transaction, enrichment } = await svc.createTransaction(ctx, input({ payment_mode: "mpesa", note: "" }))
      expect(transaction).toMatchObject({ orgId, createdBy: userId, manual: true, status: "completed", paymentMode: "mpesa", note: null })
      expect(Number(transaction.baseAmount)).toBe(1500)
      expect(transaction.baseCurrency).toBe(base)
      expect(enrichment).toEqual({ ok: true })
      expect(calls).toEqual([{ name: "enrichTransactions", args: [orgId, [transaction.id]] }])
    })
  })

  it("converts foreign amounts and refuses a currency with no rate", async () => {
    await scenario(async (ctx) => {
      if (foreign) {
        const { transaction } = await svc.createTransaction(ctx, input({ currency: foreign.currency, amount: 10 }))
        expect(Number(transaction.baseAmount)).toBeCloseTo(10 * foreign.rate, 3)
        const { transaction: updated } = await svc.updateTransaction(ctx, transaction.id, { amount: 20 })
        expect(Number(updated.baseAmount)).toBeCloseTo(20 * foreign.rate, 3)
      }
      await expect(svc.createTransaction(ctx, input({ currency: "XYZ" }))).rejects.toMatchObject({ status: 422, field: "currency" })
    })
  })

  it("marks the linked invoice paid with its balance, in one go", async () => {
    await scenario(async (ctx, tx) => {
      const [inv] = await tx
        .insert(invoices)
        .values({ orgId, userId, customerName: "TX Test", status: "unpaid", currency: base, subtotal: "2000", total: "2000", issueDate: "2026-11-01" })
        .returning({ id: invoices.id })
      const { transaction } = await svc.createTransaction(
        ctx,
        input({ type: "income", amount: 2000, invoice_id: inv!.id, mark_invoice_paid: true, payment_mode: "bank_transfer" }),
      )
      const payments = await tx.select().from(invoicePayments).where(eq(invoicePayments.invoiceId, inv!.id))
      expect(payments).toHaveLength(1)
      expect(payments[0]).toMatchObject({ transactionId: transaction.id, method: "bank_transfer", source: "manual" })
      expect(Number(payments[0]!.amount)).toBe(2000)
      const [after] = await tx.select({ status: invoices.status }).from(invoices).where(eq(invoices.id, inv!.id))
      expect(after!.status).toBe("paid")
    })
  })

  it("refuses references from another organisation and storage paths outside its own", async () => {
    await scenario(async (ctx) => {
      await expect(svc.createTransaction(ctx, input({ category_id: crypto.randomUUID() }))).rejects.toMatchObject({ status: 422, field: "category_id" })
      await expect(svc.createTransaction(ctx, input({ invoice_id: crypto.randomUUID() }))).rejects.toMatchObject({ status: 422, field: "invoice_id" })
      const { transaction } = await svc.createTransaction(ctx, input())
      await expect(
        svc.addAttachments(ctx, transaction.id, [{ file_path: `${crypto.randomUUID()}/x.pdf`, file_name: "x.pdf" }]),
      ).rejects.toMatchObject({ status: 422 })
    })
  })

  it("bulk-updates, then deletes with attachment files removed after", async () => {
    await scenario(async (ctx, tx, calls) => {
      const a = (await svc.createTransaction(ctx, input())).transaction
      const b = (await svc.createTransaction(ctx, input({ name: "TXTEST desk" }))).transaction
      const path = `${orgId}/transactions/${a.id}/receipt.pdf`
      await svc.addAttachments(ctx, a.id, [{ file_path: path, file_name: "receipt.pdf", content_type: "application/pdf" }])

      expect((await svc.bulkUpdateTransactions(ctx, [a.id, b.id], { status: "excluded" })).updated).toBe(2)
      calls.length = 0
      expect(await svc.deleteTransactions(ctx, [a.id, b.id])).toEqual({ deleted: 2 })
      expect(await tx.select().from(transactions).where(eq(transactions.id, a.id))).toEqual([])
      expect(await tx.select().from(transactionAttachments).where(eq(transactionAttachments.transactionId, a.id))).toEqual([])
      expect(calls).toEqual([{ name: "removeVaultFiles", args: [[path]] }])
    })
  })

  it("manages categories: unique names, no deleting used or built-in ones", async () => {
    await scenario(async (ctx, tx) => {
      const { category } = await svc.createCategory(ctx, { name: "TXTEST Snacks", color: "#f00" })
      expect(category.slug).toBe("txtest-snacks")
      await expect(svc.createCategory(ctx, { name: "txtest snacks" })).rejects.toMatchObject({ status: 409, field: "name" })

      await svc.createTransaction(ctx, input({ category_id: category.id }))
      await expect(svc.deleteCategory(ctx, category.id)).rejects.toMatchObject({ status: 409 })

      const [system] = await tx
        .select({ id: transactionCategories.id })
        .from(transactionCategories)
        .where(and(eq(transactionCategories.orgId, orgId), eq(transactionCategories.system, true)))
        .limit(1)
      if (system) await expect(svc.deleteCategory(ctx, system.id)).rejects.toMatchObject({ status: 403 })

      const { category: unused } = await svc.createCategory(ctx, { name: "TXTEST Unused" })
      await svc.deleteCategory(ctx, unused.id)
      expect(await tx.select().from(transactionCategories).where(eq(transactionCategories.id, unused.id))).toEqual([])
    })
  })

  it("a new rule files existing uncategorised matches, and future ones", async () => {
    await scenario(async (ctx) => {
      const { category } = await svc.createCategory(ctx, { name: "TXTEST Utilities" })
      const old = (await svc.createTransaction(ctx, input({ name: "TXTEST-KPLC tokens 123" }))).transaction
      const { rule, applied } = await svc.createCategoryRule(ctx, createCategoryRuleSchema.parse({ pattern: "txtest-kplc", category_id: category.id }))
      expect(applied).toBeGreaterThanOrEqual(1)
      expect((await svc.getTransactionRow(ctx, old.id)).categoryId).toBe(category.id)
      await expect(svc.createCategoryRule(ctx, { pattern: " TXTEST-KPLC ", category_id: category.id })).rejects.toMatchObject({ status: 409 })
      await svc.deleteCategoryRule(ctx, rule.id)
    })
  })

  it("keeps an attachment's file when the inbox or Vault still uses it", async () => {
    await scenario(async (ctx, tx, calls) => {
      const shared = (await svc.createTransaction(ctx, input())).transaction
      const own = (await svc.createTransaction(ctx, input({ name: "TXTEST own" }))).transaction
      const sharedPath = `${orgId}/inbox/${crypto.randomUUID()}.pdf`
      const ownPath = `${orgId}/transactions/${own.id}/r.pdf`
      await svc.addAttachments(ctx, shared.id, [{ file_path: sharedPath, file_name: "r.pdf" }])
      await svc.addAttachments(ctx, own.id, [{ file_path: ownPath, file_name: "r.pdf" }])
      await tx.insert(inboxItems).values({ orgId, fileName: "r.pdf", filePath: sharedPath, transactionId: shared.id, status: "done" })
      calls.length = 0
      await svc.deleteTransactions(ctx, [shared.id, own.id])
      expect(calls).toEqual([{ name: "removeVaultFiles", args: [[ownPath]] }])
    })
  })

  it("only sees the caller's organisation", async () => {
    await scenario(async (ctx) => {
      const { transaction } = await svc.createTransaction(ctx, input())
      const other = { ...ctx, orgId: crypto.randomUUID() }
      await expect(svc.updateTransaction(other, transaction.id, { name: "x" })).rejects.toMatchObject({ status: 404 })
      await expect(svc.deleteTransactions(other, [transaction.id])).rejects.toMatchObject({ status: 404 })
      await expect(svc.bulkUpdateTransactions(other, [transaction.id], { status: "excluded" })).rejects.toMatchObject({ status: 404 })
    })
  })
})
