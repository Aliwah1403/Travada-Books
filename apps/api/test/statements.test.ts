import { and, eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createDb, type Tx } from "../src/db/client.js"
import { customers, documents, invoicePayments, invoices, organizationMembers, statements } from "../src/db/schema.js"
import type { Effects } from "../src/services/effects.js"
import type { ServiceCtx } from "../src/services/invoices.js"
import { createStatementSchema } from "../src/services/statement-schemas.js"
import * as svc from "../src/services/statements.js"

// Statement services against the local Supabase Postgres. Every test runs in a
// transaction that is always rolled back — local data is never changed.

try {
  process.loadEnvFile(".env")
} catch {
  // no .env — skipped below
}

const url = process.env.DATABASE_URL
const ROLLBACK = new Error("rollback")

function fakeEffects(failEmail = false) {
  const calls: { name: string; args: unknown[] }[] = []
  const effects: Effects = {
    sendInvoiceEmail: async () => ({ queued: false }),
    sendInvoiceReminder: async () => {},
    notifyInvoicePaid: async () => {},
    scheduleInvoiceSend: async () => {},
    sendQuoteEmail: async () => ({ queued: false }),
    sendStatementEmail: async (...args) => {
      calls.push({ name: "sendStatementEmail", args })
      if (failEmail) throw new Error("resend down")
      return { queued: true }
    },
    removeVaultFiles: async (...args) => void calls.push({ name: "removeVaultFiles", args }),
    enrichTransactions: async (...args) => void calls.push({ name: "enrichTransactions", args }),
    processInboxItem: async (...args) => void calls.push({ name: "processInboxItem", args }),
    notifyInbox: async (...args) => void calls.push({ name: "notifyInbox", args }),
  }
  return { effects, calls }
}

describe.skipIf(!url)("statement services (local database)", () => {
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
    opts: { failEmail?: boolean } = {},
  ) {
    const { effects, calls } = fakeEffects(opts.failEmail)
    await db
      .transaction(async (tx) => {
        await body({ db: tx, orgId, userId, today: "2026-11-12", timezone: "Africa/Nairobi", effects }, tx, calls)
        throw ROLLBACK
      })
      .catch((error) => {
        if (error !== ROLLBACK) throw error
      })
  }

  /** A fresh customer with a known ledger: one invoice before October, one in it, one draft. */
  async function customerWithLedger(tx: Tx, email: string | null = "acme@example.test") {
    const [customer] = await tx
      .insert(customers)
      .values({ orgId, name: "Statement Test Ltd", email })
      .returning({ id: customers.id })
    const invoice = (n: string, status: string, issueDate: string, total: string) => ({
      orgId,
      userId,
      customerId: customer!.id,
      customerName: "Statement Test Ltd",
      invoiceNumber: n,
      status,
      issueDate,
      currency: "KES",
      subtotal: total,
      total,
    })
    const [before, during] = await tx
      .insert(invoices)
      .values([
        invoice("STMT-1", "unpaid", "2026-09-10", "1000"),
        invoice("STMT-2", "unpaid", "2026-10-05", "600"),
        invoice("STMT-3", "draft", "2026-10-06", "999"),
      ])
      .returning({ id: invoices.id })
    await tx.insert(invoicePayments).values([
      { orgId, invoiceId: before!.id, amount: "250", currency: "KES", paidAt: "2026-09-20T09:00:00Z" },
      { orgId, invoiceId: during!.id, amount: "100", currency: "KES", paidAt: "2026-10-20T09:00:00Z" },
    ])
    return { customerId: customer!.id, before: before!.id, during: during!.id }
  }

  const input = (customerId: string, over: Record<string, unknown> = {}) =>
    createStatementSchema.parse({ customer_id: customerId, date_from: "2026-10-01", date_to: "2026-10-31", ...over })

  it("snapshots the period and carries the opening balance", async () => {
    await scenario(async (ctx, tx, calls) => {
      const ledger = await customerWithLedger(tx)
      const { statement, email } = await svc.createStatement(ctx, input(ledger.customerId, { notes: "Thanks" }))
      expect(email).toBeUndefined()
      expect(calls).toEqual([])
      expect(Number(statement.openingBalance)).toBe(750)
      expect((statement.snapshotData as { id: string }[]).map((r) => r.id)).toEqual([ledger.during])
      expect(statement.paymentsSnapshot).toEqual([
        expect.objectContaining({ invoice_id: ledger.during, invoice_number: "STMT-2", amount: 100, paid_at: "2026-10-20T09:00:00.000Z" }),
      ])
      expect(statement.customerDetails).toMatchObject({ name: "Statement Test Ltd", email: "acme@example.test" })
      expect((statement.fromDetails as { name: string }).name).toBeTruthy()
      expect(statement.notes).toBe("Thanks")
      expect(statement.token).toMatch(/^[0-9a-f]{32}$/)
    })
  })

  it("emails it when asked, and reports a failed email without losing the statement", async () => {
    await scenario(async (ctx, tx, calls) => {
      const { customerId } = await customerWithLedger(tx)
      const { statement, email } = await svc.createStatement(ctx, input(customerId, { send: true }))
      expect(email).toEqual({ ok: true, queued: true })
      expect(calls).toEqual([{ name: "sendStatementEmail", args: [statement.id] }])
    })
    await scenario(
      async (ctx, tx) => {
        const { customerId } = await customerWithLedger(tx)
        const { statement, email } = await svc.createStatement(ctx, input(customerId, { send: true }))
        expect(email?.ok).toBe(false)
        await expect(svc.sendStatement(ctx, statement.id)).rejects.toMatchObject({ status: 502 })
      },
      { failEmail: true },
    )
  })

  it("won't email a statement whose customer had no email", async () => {
    await scenario(async (ctx, tx, calls) => {
      const { customerId } = await customerWithLedger(tx, null)
      const { statement } = await svc.createStatement(ctx, input(customerId))
      await expect(svc.sendStatement(ctx, statement.id)).rejects.toMatchObject({ status: 422 })
      expect(calls).toEqual([])
    })
  })

  it("deletes the statement, its Vault row, then the stored file", async () => {
    await scenario(async (ctx, tx, calls) => {
      const { customerId } = await customerWithLedger(tx)
      const { statement } = await svc.createStatement(ctx, input(customerId))
      const path = `${orgId}/statements/${statement.id}.pdf`
      await tx.update(statements).set({ filePath: path }).where(eq(statements.id, statement.id))
      await tx.insert(documents).values({ orgId, name: "statement.pdf", filePath: path, source: "statement" })

      await svc.deleteStatement(ctx, statement.id)
      expect(await tx.select().from(statements).where(eq(statements.id, statement.id))).toEqual([])
      expect(await tx.select().from(documents).where(and(eq(documents.orgId, orgId), eq(documents.filePath, path)))).toEqual([])
      expect(calls).toEqual([{ name: "removeVaultFiles", args: [[path]] }])
      await expect(svc.deleteStatement(ctx, statement.id)).rejects.toMatchObject({ status: 404 })
    })
  })

  it("only sees the caller's organisation", async () => {
    await scenario(async (ctx, tx) => {
      const { customerId } = await customerWithLedger(tx)
      const { statement } = await svc.createStatement(ctx, input(customerId))
      const other = { ...ctx, orgId: crypto.randomUUID() }
      await expect(svc.getStatementRow(other, statement.id)).rejects.toMatchObject({ status: 404 })
      await expect(svc.deleteStatement(other, statement.id)).rejects.toMatchObject({ status: 404 })
      await expect(svc.createStatement(other, input(customerId))).rejects.toMatchObject({ status: 422 })
    })
  })

  it("rejects a period that ends before it starts", () => {
    expect(createStatementSchema.safeParse({ customer_id: crypto.randomUUID(), date_from: "2026-10-31", date_to: "2026-10-01" }).success).toBe(false)
  })
})
