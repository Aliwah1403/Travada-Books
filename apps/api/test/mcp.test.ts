import { describe, expect, it } from "vitest"
import { z } from "zod"
import { scopeToOrg } from "../src/lib/scoped.js"
import { confirmPendingAction, cancelPendingAction } from "../src/mcp/actions.js"
import { executeTool } from "../src/mcp/registry.js"
import { allTools } from "../src/mcp/server.js"
import type { AnyTool, Channel, McpContext, ToolRuntime } from "../src/mcp/types.js"
import { ServiceError } from "../src/lib/errors.js"
import { createFakeDb, createFakeRedis } from "./fake-db.js"

const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const USER = "11111111-1111-4111-8111-111111111111"
const OTHER_USER = "22222222-2222-4222-8222-222222222222"
const SOME_ID = "33333333-3333-4333-8333-333333333333"

type FakeTables = ReturnType<typeof createFakeDb>["tables"]
const serviceCalls: { name: string; orgId: string }[] = []

/**
 * Stand-in for the invoice services (the real ones are tested against a
 * database in invoices.test.ts). Works on the same in-memory tables and
 * records each call with the org it was bound to.
 */
function fakeInvoiceServices(tables: FakeTables, orgId: string) {
  const find = (id: string) => (tables.invoices ?? []).find((row) => row.id === id && row.org_id === orgId)
  const asRow = (row: Record<string, unknown>) => ({
    ...row,
    invoiceNumber: row.invoice_number ?? null,
    amountPaid: String(row.amount_paid ?? 0),
    customerName: row.customer_name ?? null,
  })
  const call = (name: string) => serviceCalls.push({ name, orgId })
  const get = async (id: string) => {
    call("get")
    const row = find(id)
    if (!row) throw new ServiceError(404, "NOT_FOUND", "Invoice not found.")
    return asRow(row)
  }
  return {
    get,
    remove: async (id: string) => {
      call("remove")
      const row = await get(id)
      tables.invoices = (tables.invoices ?? []).filter((r) => r.id !== id)
      return { invoice: row }
    },
    recordPayment: async (input: { invoice_id: string; amount: number; method: string }) => {
      call("recordPayment")
      const row = find(input.invoice_id)!
      const payment = { id: crypto.randomUUID(), org_id: orgId, invoice_id: input.invoice_id, amount: input.amount, currency: row.currency, recorded_by: USER, method: input.method }
      ;(tables.invoice_payments ??= []).push(payment)
      row.amount_paid = Number(row.amount_paid ?? 0) + input.amount
      row.status = Number(row.amount_paid) >= Number(row.total ?? 0) ? "paid" : "partially_paid"
      return { payment, invoice: asRow(row) }
    },
    create: async () => (call("create"), { invoice: asRow({ id: SOME_ID, invoice_number: "INV-1", total: "10", currency: "KES" }) }),
    update: async () => (call("update"), { invoice: asRow({ id: SOME_ID, invoice_number: "INV-1", total: "10", currency: "KES" }) }),
    issue: async () => (call("issue"), { invoice: asRow({ id: SOME_ID, status: "unpaid" }), email: { ok: true as const } }),
    remind: async () => (call("remind"), { invoice: asRow({ id: SOME_ID }) }),
    duplicate: async () => (call("duplicate"), { invoice: asRow({ id: SOME_ID, invoice_number: "INV-2" }) }),
    cancel: async () => (call("cancel"), { invoice: asRow({ id: SOME_ID, status: "canceled" }) }),
    markPaid: async () => (call("markPaid"), { invoice: asRow({ id: SOME_ID, status: "paid" }) }),
  } as unknown as McpContext["invoices"]
}

/** Stand-in for the quote services (real ones: quotes.test.ts). */
function fakeQuoteServices(tables: FakeTables, orgId: string) {
  const find = (id: string) => (tables.quotes ?? []).find((row) => row.id === id && row.org_id === orgId)
  const asRow = (row: Record<string, unknown>) => ({
    ...row,
    quoteNumber: row.quote_number ?? null,
    customerId: row.customer_id ?? SOME_ID,
    customerName: row.customer_name ?? null,
    lineItems: row.line_items ?? [],
    customFields: [],
  })
  const call = (name: string) => serviceCalls.push({ name, orgId })
  const get = async (id: string) => {
    call("get")
    const row = find(id)
    if (!row) throw new ServiceError(404, "NOT_FOUND", "Quote not found.")
    return asRow(row)
  }
  const invoice = { id: SOME_ID, invoiceNumber: "INV-9", status: "draft" }
  return {
    get,
    remove: async (id: string) => {
      call("remove")
      const row = await get(id)
      tables.quotes = (tables.quotes ?? []).filter((r) => r.id !== id)
      return { quote: row }
    },
    create: async () => (call("create"), { quote: asRow({ id: SOME_ID, quote_number: "QUO-1", total: "10", currency: "KES" }) }),
    update: async () => (call("update"), { quote: asRow({ id: SOME_ID, quote_number: "QUO-1", total: "10", currency: "KES" }) }),
    issue: async () => (call("issue"), { quote: asRow({ id: SOME_ID, status: "sent", token: "t" }), email: { ok: true as const } }),
    duplicate: async () => (call("duplicate"), { quote: asRow({ id: SOME_ID, quote_number: "QUO-2" }) }),
    accept: async () => (call("accept"), { quote: asRow({ id: SOME_ID, status: "accepted" }), invoice }),
    decline: async () => (call("decline"), { quote: asRow({ id: SOME_ID, status: "declined" }) }),
    convert: async () => (call("convert"), { quote: asRow({ id: SOME_ID }), invoice, created: true }),
  } as unknown as McpContext["quotes"]
}

function fakeStatementServices(tables: FakeTables, orgId: string) {
  const find = (id: string) => (tables.statements ?? []).find((row) => row.id === id && row.org_id === orgId)
  const asRow = (row: Record<string, unknown>) => ({
    ...row,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    openingBalance: String(row.opening_balance ?? 0),
    snapshotData: row.snapshot_data ?? [],
    paymentsSnapshot: row.payments_snapshot ?? [],
    customerDetails: row.customer_details ?? null,
  })
  const call = (name: string) => serviceCalls.push({ name, orgId })
  const get = async (id: string) => {
    call("get")
    const row = find(id)
    if (!row) throw new ServiceError(404, "NOT_FOUND", "Statement not found.")
    return asRow(row)
  }
  return {
    get,
    create: async () => (call("create"), { statement: asRow({ id: SOME_ID, token: "t", date_from: "2026-10-01", date_to: "2026-10-31", opening_balance: 100 }) }),
    send: async () => (call("send"), { queued: false }),
    remove: async (id: string) => {
      call("remove")
      const row = await get(id)
      tables.statements = (tables.statements ?? []).filter((r) => r.id !== id)
      return { statement: row }
    },
  } as unknown as McpContext["statements"]
}

function makeCtx(
  db: ReturnType<typeof createFakeDb>["db"],
  overrides: Partial<McpContext> = {},
  tables: FakeTables = (db as unknown as { __tables: FakeTables }).__tables,
): McpContext {
  return {
    orgId: ORG_A,
    userId: USER,
    db: scopeToOrg(db, overrides.orgId ?? ORG_A),
    invoices: fakeInvoiceServices(tables, overrides.orgId ?? ORG_A),
    quotes: fakeQuoteServices(tables, overrides.orgId ?? ORG_A),
    statements: fakeStatementServices(tables, overrides.orgId ?? ORG_A),
    org: { name: "Acme Ltd", baseCurrency: "KES", countryCode: "KE" },
    user: { timezone: "Africa/Nairobi", locale: "en", dateFormat: null },
    channel: "mcp",
    client: null,
    appUrl: "http://localhost:5173",
    ...overrides,
  }
}

function makeRuntime() {
  const { redis, store } = createFakeRedis()
  const runtime: ToolRuntime = { redis: redis as unknown as ToolRuntime["redis"], analytics: { capture() {}, captureError() {}, shutdown: async () => {} } }
  return { runtime, store }
}

/** Minimal valid arguments for a tool, from its schema: required fields only. */
function sampleArgs(tool: AnyTool): Record<string, unknown> {
  const args: Record<string, unknown> = {}
  for (const [key, schema] of Object.entries(tool.input)) {
    if ((schema as z.ZodType).safeParse(undefined).success) continue
    if (key === "transaction_ids") args[key] = [SOME_ID]
    else if (key === "line_items") args[key] = [{ description: "Work", quantity: 1, price: 100 }]
    else if (key === "id" || key === "action_id" || key.endsWith("_id")) args[key] = SOME_ID
    else if (key === "from") args[key] = "2026-01-01"
    else if (key === "to") args[key] = "2026-12-31"
    else if (key === "date_from") args[key] = "2026-10-01"
    else if (key === "date_to") args[key] = "2026-10-31"
    else if (key === "amount") args[key] = 10
    else args[key] = "Acme"
  }
  // Tools whose fields are all optional but that refuse an empty call.
  if (tool.name === "customers_update") args.name = "Acme"
  // Every sample must pass the tool's own schema, or the test proves nothing.
  z.object(tool.input).parse(args)
  return args
}

describe("org scoping (plan §14: every tool returns only its organisation's data)", () => {
  for (const tool of allTools) {
    it(`${tool.name} filters every query by the caller's org`, async () => {
      const { db, calls, tables } = createFakeDb()
      const ctx = makeCtx(db, {}, tables)
      const args = sampleArgs(tool)
      serviceCalls.length = 0
      await tool.describe?.(args, ctx).catch(() => {})
      await tool.run(args, ctx).catch(() => {})

      const queries = new Map<number, typeof calls>()
      for (const call of calls) queries.set(call.query, [...(queries.get(call.query) ?? []), call])
      // Writes go through the invoice/quote services, which are bound to the
      // caller's org (and tested for scoping against a real database).
      expect(queries.size + serviceCalls.length, "tool touched no data").toBeGreaterThan(0)
      expect(serviceCalls.every((call) => call.orgId === ORG_A)).toBe(true)

      for (const queryCalls of queries.values()) {
        const first = queryCalls[0]!
        if (first.table === "(rpc)") {
          expect(first.args[0], `rpc ${first.method}`).toMatchObject({ p_org_id: ORG_A })
          continue
        }
        const insert = queryCalls.find((call) => call.method === "insert")
        if (insert) {
          for (const row of insert.args[0] as Record<string, unknown>[]) expect(row.org_id, `insert into ${first.table}`).toBe(ORG_A)
        } else {
          expect(
            queryCalls.some((call) => call.method === "eq" && call.args[0] === "org_id" && call.args[1] === ORG_A),
            `${first.table} query without org_id filter`,
          ).toBe(true)
        }
      }
    })
  }

  it("returns only the caller's org rows (two-org fixture)", async () => {
    const { db } = createFakeDb({
      invoices: [
        { id: "a1", org_id: ORG_A, invoice_number: "INV-A" },
        { id: "b1", org_id: ORG_B, invoice_number: "INV-B" },
      ],
    })
    const list = allTools.find((tool) => tool.name === "invoices_list")!
    const result = (await list.run({}, makeCtx(db))).data as { data: { id: string }[] }
    expect(result.data.map((row) => row.id)).toEqual(["a1"])
  })

  it("can't read another org's record by ID", async () => {
    const { db } = createFakeDb({ invoices: [{ id: SOME_ID, org_id: ORG_B, status: "unpaid", currency: "KES" }] })
    const get = allTools.find((tool) => tool.name === "invoices_get")!
    await expect(get.run({ id: SOME_ID }, makeCtx(db))).rejects.toThrow(/not found/)
  })
})

const tool = (name: string) => allTools.find((t) => t.name === name)!
const invoiceFixture = () =>
  createFakeDb({
    invoices: [
      { id: SOME_ID, org_id: ORG_A, invoice_number: "INV-042", status: "unpaid", currency: "KES", total: 1000, amount_paid: 0, customer_name: "Acme" },
    ],
    invoice_payments: [],
    assistant_actions: [],
  })
const text = (result: { content: { type: string; text?: string }[] }) => JSON.parse(result.content[0]!.text!)

describe("confirmations (plan §7)", () => {
  const payment = { invoice_id: SOME_ID, amount: 400 }

  it("a confirm tool on a chat channel doesn't run: it parks the exact arguments", async () => {
    const { db, tables } = invoiceFixture()
    const { runtime, store } = makeRuntime()
    const result = text(await executeTool(tool("payments_record"), payment, makeCtx(db, { channel: "telegram" }), runtime))

    expect(result.status).toBe("needs_confirmation")
    expect(result.summary).toMatch(/Record KES\s?400\.00 paid on INV-042/)
    expect(tables.invoice_payments).toHaveLength(0)
    expect(JSON.parse([...store.values()][0]!)).toMatchObject({ tool: "payments_record", args: payment, orgId: ORG_A, userId: USER })
  })

  it("confirming runs the stored arguments once and logs it", async () => {
    const { db, tables } = invoiceFixture()
    const { runtime } = makeRuntime()
    const ctx = makeCtx(db, { channel: "whatsapp" })
    const parked = text(await executeTool(tool("payments_record"), payment, ctx, runtime))

    await confirmPendingAction(parked.action_id, new Map(allTools.map((t) => [t.name, t])), ctx, runtime)
    expect(tables.invoice_payments).toHaveLength(1)
    expect(tables.invoice_payments![0]).toMatchObject({ amount: 400, currency: "KES", org_id: ORG_A, recorded_by: USER })
    expect(tables.assistant_actions).toEqual([
      expect.objectContaining({ tool: "payments_record", status: "confirmed", channel: "whatsapp", entity_type: "invoice", org_id: ORG_A }),
    ])

    // Single use: a second confirm (or a replayed button) fails.
    await expect(confirmPendingAction(parked.action_id, new Map(allTools.map((t) => [t.name, t])), ctx, runtime)).rejects.toThrow(
      /expired or was already used/,
    )
    expect(tables.invoice_payments).toHaveLength(1)
  })

  it("someone else can't confirm your action", async () => {
    const { db, tables } = invoiceFixture()
    const { runtime } = makeRuntime()
    const parked = text(await executeTool(tool("payments_record"), payment, makeCtx(db, { channel: "telegram" }), runtime))
    const intruder = makeCtx(db, { channel: "telegram", userId: OTHER_USER })

    await expect(confirmPendingAction(parked.action_id, new Map(allTools.map((t) => [t.name, t])), intruder, runtime)).rejects.toThrow(
      /belongs to someone else/,
    )
    expect(tables.invoice_payments).toHaveLength(0)
  })

  it("cancelling logs cancelled and runs nothing", async () => {
    const { db, tables } = invoiceFixture()
    const { runtime } = makeRuntime()
    const ctx = makeCtx(db, { channel: "telegram" })
    const parked = text(await executeTool(tool("payments_record"), payment, ctx, runtime))

    await cancelPendingAction(parked.action_id, ctx, runtime)
    expect(tables.invoice_payments).toHaveLength(0)
    expect(tables.assistant_actions).toEqual([expect.objectContaining({ tool: "payments_record", status: "cancelled" })])
  })

  it("over MCP, a confirm write runs directly (the client already asked) and is logged", async () => {
    const { db, tables } = invoiceFixture()
    const { runtime } = makeRuntime()
    const result = text(await executeTool(tool("payments_record"), payment, makeCtx(db, { channel: "mcp", client: "Claude" }), runtime))

    expect(result.invoice_status).toBeDefined()
    expect(tables.invoice_payments).toHaveLength(1)
    expect(tables.assistant_actions).toEqual([expect.objectContaining({ status: "done", channel: "mcp", client: "Claude" })])
  })

  it("over MCP, a destructive tool still needs confirmation", async () => {
    const { db } = createFakeDb({ invoices: [{ id: SOME_ID, org_id: ORG_A, status: "draft", currency: "KES", total: 5, invoice_number: null }] })
    const { runtime } = makeRuntime()
    const result = text(await executeTool(tool("invoices_delete_draft"), { id: SOME_ID }, makeCtx(db), runtime))
    expect(result.status).toBe("needs_confirmation")
  })

  it("refuses to park an impossible action (deleting a sent invoice)", async () => {
    const { db } = createFakeDb({ invoices: [{ id: SOME_ID, org_id: ORG_A, status: "unpaid", currency: "KES", invoice_number: "INV-1" }] })
    const { runtime, store } = makeRuntime()
    const result = await executeTool(tool("invoices_delete_draft"), { id: SOME_ID }, makeCtx(db), runtime)
    expect(result.isError).toBe(true)
    expect(result.content[0]).toMatchObject({ text: expect.stringMatching(/not a draft/) })
    expect(store.size).toBe(0)
  })

  for (const channel of ["telegram", "whatsapp", "imessage", "slack", "web"] satisfies Channel[]) {
    it(`every confirm tool waits on ${channel}`, async () => {
      for (const t of allTools.filter((candidate) => candidate.confirm)) {
        const needsDraft = t.name === "invoices_delete_draft" || t.name === "invoices_send"
        const { db } = createFakeDb({
          invoices: [
            { id: SOME_ID, org_id: ORG_A, status: needsDraft ? "draft" : "unpaid", currency: "KES", total: 10, amount_paid: 0, customer_id: OTHER_USER },
          ],
          quotes: [
            {
              id: SOME_ID,
              org_id: ORG_A,
              status: t.name === "quotes_mark_accepted" ? "sent" : "draft",
              currency: "KES",
              total: 10,
              customer_id: OTHER_USER,
              quote_number: "QUO-1",
            },
          ],
          customers: [{ id: OTHER_USER, org_id: ORG_A, name: "Acme", email: "billing@acme.test" }],
          statements: [
            {
              id: SOME_ID,
              org_id: ORG_A,
              customer_id: OTHER_USER,
              date_from: "2026-10-01",
              date_to: "2026-10-31",
              email_status: null,
              customer_details: { name: "Acme", email: "billing@acme.test" },
            },
          ],
        })
        const { runtime } = makeRuntime()
        const result = text(await executeTool(t, sampleArgs(t), makeCtx(db, { channel }), runtime))
        expect(result.status, t.name).toBe("needs_confirmation")
      }
    })
  }
})

describe("action log (plan §9)", () => {
  it("logs successful writes as done and failures as failed", async () => {
    const { db, tables } = createFakeDb({ customers: [], assistant_actions: [] })
    const { runtime } = makeRuntime()
    const ctx = makeCtx(db)

    await executeTool(tool("customers_create"), { name: "Beta Ltd" }, ctx, runtime)
    const failed = await executeTool(tool("customers_update"), { id: SOME_ID, name: "Nope" }, ctx, runtime)

    expect(failed.isError).toBe(true)
    expect(tables.assistant_actions).toEqual([
      expect.objectContaining({ tool: "customers_create", status: "done", summary: "Created customer Beta Ltd", entity_type: "customer" }),
      expect.objectContaining({ tool: "customers_update", status: "failed" }),
    ])
  })

  it("reads are never logged", async () => {
    const { db, tables } = createFakeDb({ customers: [], assistant_actions: [] })
    const { runtime } = makeRuntime()
    await executeTool(tool("customers_list"), {}, makeCtx(db), runtime)
    expect(tables.assistant_actions).toHaveLength(0)
  })
})
