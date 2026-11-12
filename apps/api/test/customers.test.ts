import { eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createDb, type Tx } from "../src/db/client.js"
import { customers, invoices, organizationMembers, quotes, statements } from "../src/db/schema.js"
import { createCustomerSchema, updateCustomerSchema } from "../src/services/customer-schemas.js"
import * as svc from "../src/services/customers.js"
import type { Effects } from "../src/services/effects.js"
import type { ServiceCtx } from "../src/services/invoices.js"

// Customer services against the local Supabase Postgres. Every test runs in a
// transaction that is always rolled back — local data is never changed.

try {
  process.loadEnvFile(".env")
} catch {
  // no .env — skipped below
}

const url = process.env.DATABASE_URL
const ROLLBACK = new Error("rollback")
const effects = {} as Effects

describe.skipIf(!url)("customer services (local database)", () => {
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
        await body({ db: tx, orgId, userId, today: "2026-11-12", timezone: "Africa/Nairobi", effects }, tx)
        throw ROLLBACK
      })
      .catch((error) => {
        if (error !== ROLLBACK) throw error
      })
  }

  const create = (ctx: ServiceCtx, over: Record<string, unknown> = {}) =>
    svc.createCustomer(ctx, createCustomerSchema.parse({ name: "Customer Test Ltd", email: "a@example.test", country_code: "ke", ...over }))

  it("creates and updates, clearing fields sent empty and keeping the rest", async () => {
    await scenario(async (ctx) => {
      const { customer } = await create(ctx, { phone: "0700", preferred_currency: "kes" })
      expect(customer).toMatchObject({ orgId, name: "Customer Test Ltd", countryCode: "KE", preferredCurrency: "KES", phone: "0700" })

      const { customer: updated } = await svc.updateCustomer(ctx, customer.id, updateCustomerSchema.parse({ phone: "", city: "Nairobi" }))
      expect(updated).toMatchObject({ phone: null, city: "Nairobi", email: "a@example.test" })
    })
  })

  it("archives, toggles the portal keeping its link, and regenerates it", async () => {
    await scenario(async (ctx) => {
      const { customer } = await create(ctx)
      expect((await svc.archiveCustomer(ctx, customer.id, true)).customer.isArchived).toBe(true)

      const on = (await svc.setCustomerPortal(ctx, customer.id, true)).customer
      expect(on.portalEnabled).toBe(true)
      expect(on.portalId).toBeTruthy()
      const off = (await svc.setCustomerPortal(ctx, customer.id, false)).customer
      expect(off).toMatchObject({ portalEnabled: false, portalId: on.portalId })
      expect((await svc.setCustomerPortal(ctx, customer.id, true)).customer.portalId).toBe(on.portalId)

      const fresh = (await svc.regenerateCustomerPortal(ctx, customer.id)).customer.portalId
      expect(fresh).toBeTruthy()
      expect(fresh).not.toBe(on.portalId)
    })
  })

  it("clears enrichment", async () => {
    await scenario(async (ctx, tx) => {
      const { customer } = await create(ctx)
      await tx.update(customers).set({ enrichmentStatus: "done", description: "x", ceoName: "y" }).where(eq(customers.id, customer.id))
      expect((await svc.cancelEnrichment(ctx, customer.id)).customer.enrichmentStatus).toBeNull()
      expect((await svc.clearEnrichment(ctx, customer.id)).customer).toMatchObject({ description: null, ceoName: null })
    })
  })

  it("deletes a customer with their statements; invoices stay unlinked", async () => {
    await scenario(async (ctx, tx) => {
      const { customer } = await create(ctx)
      const [inv] = await tx
        .insert(invoices)
        .values({ orgId, userId, customerId: customer.id, customerName: customer.name, status: "draft", currency: "KES" })
        .returning({ id: invoices.id })
      await tx.insert(statements).values({ orgId, customerId: customer.id, dateFrom: "2026-10-01", dateTo: "2026-10-31" })

      await svc.deleteCustomer(ctx, customer.id)
      expect(await tx.select().from(customers).where(eq(customers.id, customer.id))).toEqual([])
      expect(await tx.select().from(statements).where(eq(statements.customerId, customer.id))).toEqual([])
      const [kept] = await tx.select({ customerId: invoices.customerId }).from(invoices).where(eq(invoices.id, inv!.id))
      expect(kept).toEqual({ customerId: null })
    })
  })

  it("refuses to delete a customer who still has quotes, without breaking the transaction", async () => {
    await scenario(async (ctx, tx) => {
      const { customer } = await create(ctx)
      await tx.insert(quotes).values({ orgId, userId, customerId: customer.id, customerName: customer.name, currency: "KES" })
      await expect(svc.deleteCustomer(ctx, customer.id)).rejects.toMatchObject({ status: 409, code: "CONFLICT" })
      expect((await svc.getCustomerRow(ctx, customer.id)).id).toBe(customer.id)
    })
  })

  it("only sees the caller's organisation", async () => {
    await scenario(async (ctx) => {
      const { customer } = await create(ctx)
      const other = { ...ctx, orgId: crypto.randomUUID() }
      await expect(svc.updateCustomer(other, customer.id, { name: "x" })).rejects.toMatchObject({ status: 404 })
      await expect(svc.archiveCustomer(other, customer.id, true)).rejects.toMatchObject({ status: 404 })
      await expect(svc.setCustomerPortal(other, customer.id, true)).rejects.toMatchObject({ status: 404 })
      await expect(svc.deleteCustomer(other, customer.id)).rejects.toMatchObject({ status: 404 })
    })
  })

  it("requires a name", () => {
    expect(createCustomerSchema.safeParse({ name: "  " }).success).toBe(false)
    expect(createCustomerSchema.safeParse({ email: "a@b.c" }).success).toBe(false)
  })
})
