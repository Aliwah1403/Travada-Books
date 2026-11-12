import { addDays, computeStoredTotals } from "@travada-books/core"
import { and, eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createDb, type Tx } from "../src/db/client.js"
import { customers, invoices, organizationMembers, organizations, quoteTemplates, quotes } from "../src/db/schema.js"
import { ServiceError } from "../src/lib/errors.js"
import type { Effects } from "../src/services/effects.js"
import type { ServiceCtx } from "../src/services/invoices.js"
import { saveQuoteSchema } from "../src/services/quote-schemas.js"
import * as svc from "../src/services/quotes.js"

// Quote services against the local Supabase Postgres. Every test runs in a
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
    sendInvoiceEmail: async (...args) => (calls.push({ name: "sendInvoiceEmail", args }), { queued: false }),
    sendInvoiceReminder: async (...args) => void calls.push({ name: "sendInvoiceReminder", args }),
    notifyInvoicePaid: async (...args) => void calls.push({ name: "notifyInvoicePaid", args }),
    scheduleInvoiceSend: async (...args) => void calls.push({ name: "scheduleInvoiceSend", args }),
    sendQuoteEmail: async (...args) => {
      calls.push({ name: "sendQuoteEmail", args })
      if (failEmail) throw new Error("resend down")
      return { queued: true }
    },
    sendStatementEmail: async (...args) => (calls.push({ name: "sendStatementEmail", args }), { queued: false }),
    removeVaultFile: async (...args) => void calls.push({ name: "removeVaultFile", args }),
  }
  return { effects, calls }
}

describe.skipIf(!url)("quote services (local database)", () => {
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

  const input = (over: Record<string, unknown> = {}) =>
    saveQuoteSchema.parse({
      customer_id: customerId,
      quote_number: `QTEST-${crypto.randomUUID().slice(0, 8)}`,
      currency: baseCurrency,
      issue_date: "2026-11-12",
      valid_until: "2026-12-12",
      line_items: [
        { description: "Design", quantity: 2, price: 5000, tax_rate: 0 },
        { description: "Hosting", quantity: 1, price: 1000, tax_rate: 16 },
      ],
      discount: { type: "fixed", value: 500 },
      vat_rate: null,
      note: "Valid for 30 days",
      action: "draft",
      ...over,
    })

  /** A quote that has been sent (as if by email), ready to accept/decline. */
  async function sentQuote(ctx: ServiceCtx, over: Record<string, unknown> = {}) {
    const { quote } = await svc.createQuote(ctx, input(over))
    return (await svc.issueQuote(ctx, quote.id, "manual")).quote
  }

  it("creates a draft with server-computed totals, FX and no side effects", async () => {
    await scenario(async (ctx, _tx, calls) => {
      const data = input()
      const { quote } = await svc.createQuote(ctx, data)
      const expected = computeStoredTotals(data.line_items, data.discount, data.vat_rate)
      expect(quote.status).toBe("draft")
      expect(Number(quote.total)).toBeCloseTo(expected.total, 2)
      expect(Number(quote.exchangeRate)).toBe(1)
      expect(quote.baseCurrency).toBe(baseCurrency)
      expect(quote.fromDetails).toBeNull()
      expect(quote.sentAt).toBeNull()
      expect(calls).toEqual([])
    })
  })

  it("auto-numbers, and fills valid_until from the template only when it's left out", async () => {
    await scenario(async (ctx, tx) => {
      const { quote_number: _n, valid_until: _v, ...rest } = input()
      const { quote } = await svc.createQuote(ctx, rest)
      expect(quote.quoteNumber).toBeTruthy()
      const [template] = await tx
        .select({ days: quoteTemplates.validityDays })
        .from(quoteTemplates)
        .where(and(eq(quoteTemplates.orgId, orgId), eq(quoteTemplates.isDefault, true)))
        .limit(1)
      // The template's validity period from the issue date; none → no expiry.
      expect(quote.validUntil).toBe(template?.days != null ? addDays("2026-11-12", template.days) : null)

      const { quote: noExpiry } = await svc.createQuote(ctx, input({ valid_until: null }))
      expect(noExpiry.validUntil).toBeNull()
    })
  })

  it("send: issues with snapshots, then emails once", async () => {
    await scenario(async (ctx, _tx, calls) => {
      const { quote, email } = await svc.createQuote(ctx, input({ action: "send" }))
      expect(quote.status).toBe("sent")
      expect(quote.sentVia).toBe("email")
      expect(quote.fromDetails).toMatchObject({ name: expect.any(String) })
      expect(quote.customerDetails).toMatchObject({ name: expect.any(String) })
      expect(email).toEqual({ ok: true, queued: true })
      expect(calls).toEqual([{ name: "sendQuoteEmail", args: [quote.id] }])
    })
  })

  it("a failed email doesn't undo the send", async () => {
    await scenario(
      async (ctx) => {
        const { quote, email } = await svc.createQuote(ctx, input({ action: "send" }))
        expect(quote.status).toBe("sent")
        expect(email).toMatchObject({ ok: false, error: "resend down" })
        await expect(svc.resendQuoteEmail(ctx, quote.id)).rejects.toMatchObject({ status: 502 })
      },
      { failEmail: true },
    )
  })

  it("a taken quote number becomes QUOTE_NUMBER_TAKEN on that field", async () => {
    await scenario(async (ctx) => {
      const first = input()
      await svc.createQuote(ctx, first)
      const error = await svc.createQuote(ctx, input({ quote_number: first.quote_number })).catch((e: unknown) => e)
      expect(error).toBeInstanceOf(ServiceError)
      expect(error).toMatchObject({ status: 409, code: "QUOTE_NUMBER_TAKEN", field: "quote_number" })
    })
  })

  it("only drafts and declined quotes can be edited; saving a declined one resets it to draft", async () => {
    await scenario(async (ctx) => {
      const sent = await sentQuote(ctx)
      await expect(svc.updateQuote(ctx, sent.id, input())).rejects.toMatchObject({ code: "INVALID_STATE" })

      await svc.declineQuote(ctx, sent.id, "Too expensive")
      const { quote } = await svc.updateQuote(ctx, sent.id, input({ line_items: [{ description: "Cheaper", quantity: 1, price: 100 }] }))
      expect(quote.status).toBe("draft")
      expect(Number(quote.total)).toBe(0) // 100 - the fixed 500 discount, floored at zero
    })
  })

  it("resending keeps the original sent_at and stamps resent_at", async () => {
    await scenario(async (ctx) => {
      const sent = await sentQuote(ctx)
      await svc.declineQuote(ctx, sent.id, null)
      const { quote } = await svc.issueQuote(ctx, sent.id, "whatsapp")
      expect(quote.status).toBe("sent")
      expect(quote.sentAt).toBe(sent.sentAt)
      expect(quote.resentAt).not.toBeNull()
      expect(quote.sentVia).toBe("whatsapp")
      await expect(svc.issueQuote(ctx, sent.id, "email")).rejects.toMatchObject({ code: "INVALID_STATE" })
    })
  })

  it("accept marks it accepted and creates its draft invoice in one step", async () => {
    await scenario(async (ctx, tx) => {
      const sent = await sentQuote(ctx)
      const { quote, invoice } = await svc.acceptQuote(ctx, sent.id)
      expect(quote.status).toBe("accepted")
      expect(quote.acceptedAt).not.toBeNull()
      const [row] = await tx.select().from(invoices).where(eq(invoices.id, invoice.id))
      expect(row).toMatchObject({
        quoteId: sent.id,
        status: "draft",
        customerId: sent.customerId,
        issueDate: "2026-11-12",
        total: sent.total,
        currency: sent.currency,
      })
      expect(row!.fromDetails).toEqual(sent.fromDetails)
      expect(row!.invoiceNumber).toBeTruthy()

      // Converting again returns the same invoice rather than a second one.
      const again = await svc.convertQuoteToInvoice(ctx, sent.id)
      expect(again).toMatchObject({ created: false, invoice: { id: invoice.id } })
      await expect(svc.acceptQuote(ctx, sent.id)).rejects.toMatchObject({ code: "INVALID_STATE" })
    })
  })

  it("convert repairs an accepted quote that has no invoice", async () => {
    await scenario(async (ctx, tx) => {
      const sent = await sentQuote(ctx)
      // As if accept-quote flipped the status but failed to create the invoice.
      await tx.update(quotes).set({ status: "accepted" }).where(eq(quotes.id, sent.id))
      const { invoice, created } = await svc.convertQuoteToInvoice(ctx, sent.id)
      expect(created).toBe(true)
      expect(invoice.status).toBe("draft")

      const draft = (await svc.createQuote(ctx, input())).quote
      await expect(svc.convertQuoteToInvoice(ctx, draft.id)).rejects.toMatchObject({ code: "INVALID_STATE" })
    })
  })

  it("an expired quote can't be accepted", async () => {
    await scenario(async (ctx) => {
      const sent = await sentQuote(ctx, { valid_until: "2026-11-11" })
      await expect(svc.acceptQuote(ctx, sent.id)).rejects.toMatchObject({ code: "INVALID_STATE", message: expect.stringContaining("expired") })
      // Still valid through its last day.
      const lastDay = await sentQuote(ctx, { valid_until: "2026-11-12" })
      await expect(svc.acceptQuote(ctx, lastDay.id)).resolves.toMatchObject({ quote: { status: "accepted" } })
    })
  })

  it("decline records the reason; only sent quotes can be declined", async () => {
    await scenario(async (ctx) => {
      const sent = await sentQuote(ctx)
      const { quote } = await svc.declineQuote(ctx, sent.id, "Went with someone else")
      expect(quote).toMatchObject({ status: "declined", declineReason: "Went with someone else" })
      await expect(svc.declineQuote(ctx, sent.id, null)).rejects.toMatchObject({ code: "INVALID_STATE" })
    })
  })

  it("duplicate makes a fresh draft with a new number; delete keeps the invoice", async () => {
    await scenario(async (ctx, tx) => {
      const sent = await sentQuote(ctx)
      const { quote: copy } = await svc.duplicateQuote(ctx, sent.id)
      expect(copy.status).toBe("draft")
      expect(copy.quoteNumber).not.toBe(sent.quoteNumber)
      expect(copy.total).toBe(sent.total)
      expect(copy.sentAt).toBeNull()

      const { invoice } = await svc.acceptQuote(ctx, sent.id)
      await svc.deleteQuote(ctx, sent.id)
      const [row] = await tx.select({ quoteId: invoices.quoteId }).from(invoices).where(eq(invoices.id, invoice.id))
      expect(row).toEqual({ quoteId: null })
    })
  })

  it("internal note saves; empty clears it", async () => {
    await scenario(async (ctx) => {
      const { quote } = await svc.createQuote(ctx, input())
      expect((await svc.updateQuoteMeta(ctx, quote.id, { internal_note: "Call Tuesday" })).quote.internalNote).toBe("Call Tuesday")
      expect((await svc.updateQuoteMeta(ctx, quote.id, { internal_note: "" })).quote.internalNote).toBeNull()
    })
  })

  it("another org can't see or change the quote", async () => {
    await scenario(async (ctx, tx) => {
      const sent = await sentQuote(ctx)
      const [other] = await tx
        .insert(organizations)
        .values({ name: "Other org (test)", baseCurrency: "KES" })
        .returning({ id: organizations.id })
      const intruder = { ...ctx, orgId: other!.id }
      await expect(svc.getQuoteRow(intruder, sent.id)).rejects.toMatchObject({ code: "NOT_FOUND" })
      await expect(svc.deleteQuote(intruder, sent.id)).rejects.toMatchObject({ code: "NOT_FOUND" })
      await expect(svc.acceptQuote(intruder, sent.id)).rejects.toMatchObject({ code: "NOT_FOUND" })
      await expect(svc.convertQuoteToInvoice(intruder, sent.id)).rejects.toMatchObject({ code: "NOT_FOUND" })
      await expect(svc.declineQuote(intruder, sent.id, null)).rejects.toMatchObject({ code: "NOT_FOUND" })
      await expect(svc.updateQuoteMeta(intruder, sent.id, { internal_note: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" })
      await expect(svc.createQuote(intruder, input())).rejects.toMatchObject({ code: "VALIDATION_FAILED", field: "customer_id" })
      expect((await svc.getQuoteRow(ctx, sent.id)).status).toBe("sent")
    })
  })
})
