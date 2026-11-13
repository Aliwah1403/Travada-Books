import { computeStoredTotals } from "@travada-books/core"
import { and, eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createDb, type Tx } from "../src/db/client.js"
import { customers, invoiceRecurring, organizationMembers, organizations } from "../src/db/schema.js"
import { ServiceError } from "../src/lib/errors.js"
import type { Effects } from "../src/services/effects.js"
import { saveInvoiceSchema } from "../src/services/invoice-schemas.js"
import * as svc from "../src/services/invoices.js"

// Invoice services against the local Supabase Postgres. Every test runs in a
// transaction that is always rolled back — local data is never changed.
// Services open their own transactions inside it (savepoints).

try {
  process.loadEnvFile(".env")
} catch {
  // no .env — skipped below
}
const url = process.env.DATABASE_URL
const ROLLBACK = new Error("rollback")

function fakeEffects() {
  const calls: { name: string; args: unknown[] }[] = []
  const effects: Effects = {
    sendInvoiceEmail: async (...args) => (calls.push({ name: "sendInvoiceEmail", args }), { queued: false }),
    sendInvoiceReminder: async (...args) => void calls.push({ name: "sendInvoiceReminder", args }),
    notifyInvoicePaid: async (...args) => void calls.push({ name: "notifyInvoicePaid", args }),
    scheduleInvoiceSend: async (...args) => void calls.push({ name: "scheduleInvoiceSend", args }),
    sendQuoteEmail: async (...args) => (calls.push({ name: "sendQuoteEmail", args }), { queued: false }),
    sendStatementEmail: async (...args) => (calls.push({ name: "sendStatementEmail", args }), { queued: false }),
    removeVaultFiles: async (...args) => void calls.push({ name: "removeVaultFiles", args }),
    enrichTransactions: async (...args) => void calls.push({ name: "enrichTransactions", args }),
  }
  return { effects, calls }
}

describe.skipIf(!url)("invoice services (local database)", () => {
  const { db, close } = createDb(url ?? "")
  let orgId = ""
  let userId = ""
  let customerId = ""
  let baseCurrency = ""
  afterAll(() => close())

  beforeAll(async () => {
    const [member] = await db
      .select({ orgId: organizationMembers.orgId, userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(eq(organizationMembers.status, "active"))
      .limit(1)
    orgId = member!.orgId
    userId = member!.userId!
    const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.orgId, orgId)).limit(1)
    customerId = customer!.id
    const [org] = await db.select({ base: organizations.baseCurrency }).from(organizations).where(eq(organizations.id, orgId))
    baseCurrency = org!.base
  })

  /** Runs a test body in a rolled-back transaction with a service context. */
  async function scenario(body: (ctx: svc.ServiceCtx, tx: Tx, calls: ReturnType<typeof fakeEffects>["calls"]) => Promise<void>) {
    const { effects, calls } = fakeEffects()
    await db
      .transaction(async (tx) => {
        await body({ db: tx, orgId, userId, today: "2026-11-11", timezone: "Africa/Nairobi", effects }, tx, calls)
        throw ROLLBACK
      })
      .catch((error) => {
        if (error !== ROLLBACK) throw error
      })
  }

  const input = (over: Record<string, unknown> = {}) =>
    saveInvoiceSchema.parse({
      customer_id: customerId,
      invoice_number: `TEST-${crypto.randomUUID().slice(0, 8)}`,
      currency: baseCurrency,
      issue_date: "2026-11-11",
      due_date: "2026-11-25",
      line_items: [
        { description: "Design", quantity: 2, price: 5000, tax_rate: 0 },
        { description: "Hosting", quantity: 1, price: 1000, tax_rate: 16 },
      ],
      discount: { type: "%", value: 10 },
      vat_rate: 16,
      action: "draft",
      ...over,
    })

  it("creates a draft with server-computed totals and no side effects", async () => {
    await scenario(async (ctx, _tx, calls) => {
      const data = input()
      const { invoice } = await svc.createInvoice(ctx, data)
      const expected = computeStoredTotals(data.line_items, data.discount, data.vat_rate)
      expect(invoice.status).toBe("draft")
      expect(Number(invoice.total)).toBeCloseTo(expected.total, 2)
      expect(Number(invoice.vatRate)).toBe(16)
      expect(Number(invoice.discountPercent)).toBe(10)
      expect(Array.isArray(invoice.lineItems)).toBe(true) // jsonb round-trips as an array, not a string
      expect(invoice.fromDetails).toBeNull()
      expect(calls).toEqual([])
    })
  })

  it("auto-numbers when no invoice number is given", async () => {
    await scenario(async (ctx) => {
      const { invoice_number: _omit, ...rest } = input()
      const { invoice } = await svc.createInvoice(ctx, { ...rest })
      expect(invoice.invoiceNumber).toMatch(/\d+$/)
    })
  })

  it("send: issues with snapshots and FX, then emails once", async () => {
    await scenario(async (ctx, _tx, calls) => {
      const { invoice, email } = await svc.createInvoice(ctx, input({ action: "send" }))
      expect(invoice.status).toBe("unpaid")
      expect(invoice.sentVia).toBe("email")
      expect(invoice.fromDetails).toMatchObject({ name: expect.any(String) })
      expect(invoice.customerDetails).toMatchObject({ name: expect.any(String) })
      expect(Number(invoice.exchangeRate)).toBe(1)
      expect(invoice.baseCurrency).toBe(baseCurrency)
      expect(email).toEqual({ ok: true, queued: false })
      expect(calls).toEqual([{ name: "sendInvoiceEmail", args: [invoice.id] }])
    })
  })

  it("recurring: the series is created and linked in the same transaction", async () => {
    await scenario(async (ctx, tx) => {
      const { invoice } = await svc.createInvoice(ctx, input({ action: "send", recurring: { frequency: "monthly" } }))
      expect(invoice.invoiceRecurringId).toBeTruthy()
      expect(invoice.recurringSequence).toBe(1)
      const [series] = await tx.select().from(invoiceRecurring).where(eq(invoiceRecurring.id, invoice.invoiceRecurringId!))
      expect(series).toMatchObject({ frequency: "monthly", status: "active", orgId, sourceIssueDate: "2026-11-11" })
      expect(series!.nextScheduledAt).toMatch(/^2026-12-11/)
    })
  })

  it("a taken invoice number becomes INVOICE_NUMBER_TAKEN on that field", async () => {
    await scenario(async (ctx) => {
      const first = input()
      await svc.createInvoice(ctx, first)
      const error = await svc.createInvoice(ctx, input({ invoice_number: first.invoice_number })).catch((e: unknown) => e)
      expect(error).toBeInstanceOf(ServiceError)
      expect(error).toMatchObject({ status: 409, code: "INVOICE_NUMBER_TAKEN", field: "invoice_number" })
    })
  })

  it("only drafts can be edited", async () => {
    await scenario(async (ctx) => {
      const { invoice } = await svc.createInvoice(ctx, input({ action: "send" }))
      await expect(svc.updateInvoice(ctx, invoice.id, input())).rejects.toMatchObject({ code: "INVALID_STATE" })
    })
  })

  it("editing a draft recomputes totals; sending it from edit emails it", async () => {
    await scenario(async (ctx, _tx, calls) => {
      const { invoice } = await svc.createInvoice(ctx, input())
      const updated = await svc.updateInvoice(
        ctx,
        invoice.id,
        input({ invoice_number: invoice.invoiceNumber, line_items: [{ description: "X", quantity: 1, price: 100, tax_rate: 0 }], discount: null, vat_rate: null, action: "send" }),
      )
      expect(Number(updated.invoice.total)).toBe(100)
      expect(updated.invoice.status).toBe("unpaid")
      expect(calls.map((c) => c.name)).toEqual(["sendInvoiceEmail"])
    })
  })

  it("issue via a non-email channel marks it sent without emailing", async () => {
    await scenario(async (ctx, _tx, calls) => {
      const { invoice } = await svc.createInvoice(ctx, input())
      const issued = await svc.issueInvoice(ctx, invoice.id, "manual")
      expect(issued.invoice).toMatchObject({ status: "unpaid", sentVia: "manual" })
      expect(issued.invoice.customerDetails).toBeTruthy()
      expect(calls).toEqual([])
      await expect(svc.issueInvoice(ctx, invoice.id, "email")).rejects.toMatchObject({ code: "INVALID_STATE" })
    })
  })

  it("payments: part, then the rest → paid and one notification", async () => {
    await scenario(async (ctx, _tx, calls) => {
      const { invoice } = await svc.createInvoice(ctx, input({ action: "send" }))
      const total = Number(invoice.total)
      const part = await svc.recordPayment(ctx, { invoice_id: invoice.id, amount: 100, method: "mpesa" })
      expect(part.invoice.status).toBe("partially_paid")
      expect(calls.filter((c) => c.name === "notifyInvoicePaid")).toHaveLength(0)

      const rest = await svc.markInvoicePaid(ctx, invoice.id)
      expect(rest.payment.method).toBe("other")
      expect(Number(rest.payment.amount)).toBeCloseTo(total - 100, 2)
      expect(rest.invoice.status).toBe("paid")
      expect(calls.filter((c) => c.name === "notifyInvoicePaid")).toEqual([{ name: "notifyInvoicePaid", args: [invoice.id] }])

      await expect(svc.recordPayment(ctx, { invoice_id: invoice.id, amount: 1, method: "cash" })).rejects.toMatchObject({ code: "INVALID_STATE" })

      // Deleting a payment re-derives the status.
      const undone = await svc.deletePayment(ctx, rest.payment.id)
      expect(undone.invoice.status).toBe("partially_paid")
    })
  })

  it("can't record a payment on a draft", async () => {
    await scenario(async (ctx) => {
      const { invoice } = await svc.createInvoice(ctx, input())
      await expect(svc.recordPayment(ctx, { invoice_id: invoice.id, amount: 1, method: "cash" })).rejects.toMatchObject({ code: "INVALID_STATE" })
    })
  })

  it("cancel needs no payments; reopen restores the derived status", async () => {
    await scenario(async (ctx) => {
      const { invoice } = await svc.createInvoice(ctx, input({ action: "send", due_date: "2026-11-01" }))
      const canceled = await svc.cancelInvoice(ctx, invoice.id)
      expect(canceled.invoice.status).toBe("canceled")
      const reopened = await svc.reopenInvoice(ctx, invoice.id)
      expect(reopened.invoice.status).toBe("overdue") // due 2026-11-01, today 2026-11-11

      await svc.recordPayment(ctx, { invoice_id: invoice.id, amount: 10, method: "cash" })
      await expect(svc.cancelInvoice(ctx, invoice.id)).rejects.toMatchObject({ code: "INVALID_STATE" })
    })
  })

  it("cancel schedule returns a scheduled invoice to draft", async () => {
    await scenario(async (ctx) => {
      const at = new Date(Date.now() + 86_400_000).toISOString()
      const { invoice } = await svc.createInvoice(ctx, input({ action: "schedule", schedule_at: at }))
      const { invoice: draft } = await svc.unscheduleInvoice(ctx, invoice.id)
      expect(draft).toMatchObject({ status: "draft", scheduledAt: null })
      await expect(svc.unscheduleInvoice(ctx, invoice.id)).rejects.toMatchObject({ code: "INVALID_STATE" })
    })
  })

  it("duplicate makes a fresh draft with a new number", async () => {
    await scenario(async (ctx) => {
      const { invoice } = await svc.createInvoice(ctx, input({ action: "send" }))
      const { invoice: copy } = await svc.duplicateInvoice(ctx, invoice.id)
      expect(copy).toMatchObject({ status: "draft", issueDate: null, recurring: "one_time", total: invoice.total })
      expect(copy.invoiceNumber).not.toBe(invoice.invoiceNumber)
    })
  })

  it("reminders only for unpaid invoices", async () => {
    await scenario(async (ctx, _tx, calls) => {
      const { invoice: draft } = await svc.createInvoice(ctx, input())
      await expect(svc.sendReminder(ctx, draft.id)).rejects.toMatchObject({ code: "INVALID_STATE" })
      const { invoice } = await svc.createInvoice(ctx, input({ action: "send" }))
      await svc.sendReminder(ctx, invoice.id)
      expect(calls.at(-1)).toEqual({ name: "sendInvoiceReminder", args: [invoice.id] })
    })
  })

  it("another org can't see or change the invoice", async () => {
    await scenario(async (ctx, tx) => {
      const { invoice } = await svc.createInvoice(ctx, input())
      const [other] = await tx
        .insert(organizations)
        .values({ name: "Other org (test)", baseCurrency: "KES" })
        .returning({ id: organizations.id })
      const intruder = { ...ctx, orgId: other!.id }
      await expect(svc.getInvoiceRow(intruder, invoice.id)).rejects.toMatchObject({ code: "NOT_FOUND" })
      await expect(svc.deleteInvoice(intruder, invoice.id)).rejects.toMatchObject({ code: "NOT_FOUND" })
      await expect(svc.recordPayment(intruder, { invoice_id: invoice.id, amount: 1, method: "cash" })).rejects.toMatchObject({ code: "NOT_FOUND" })
      // …and can't attach its invoice to this org's customer.
      await expect(svc.createInvoice(intruder, input())).rejects.toMatchObject({ code: "VALIDATION_FAILED", field: "customer_id" })
      expect((await svc.getInvoiceRow(ctx, invoice.id)).id).toBe(invoice.id)
    })
  })

  it("scheduling queues the send after commit", async () => {
    await scenario(async (ctx, _tx, calls) => {
      const at = new Date(Date.now() + 86_400_000).toISOString()
      const { invoice, schedule } = await svc.createInvoice(ctx, input({ action: "schedule", schedule_at: at }))
      expect(invoice.status).toBe("scheduled")
      expect(invoice.customerDetails).toBeTruthy()
      expect(invoice.exchangeRate).toBeNull() // FX is taken when it actually sends
      expect(schedule).toEqual({ ok: true })
      expect(calls).toEqual([{ name: "scheduleInvoiceSend", args: [invoice.id, at] }])
    })
  })

  it("a failed email doesn't undo the send", async () => {
    await scenario(async (ctx, tx) => {
      const failing = { ...ctx, effects: { ...ctx.effects, sendInvoiceEmail: async () => Promise.reject(new Error("boom")) } }
      const { invoice, email } = await svc.createInvoice(failing, input({ action: "send" }))
      expect(email).toEqual({ ok: false, error: "boom" })
      const [stillThere] = await tx.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId)))
      expect(stillThere).toBeTruthy()
      expect((await svc.getInvoiceRow(ctx, invoice.id)).status).toBe("unpaid")
    })
  })
})
