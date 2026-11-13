import { count, eq } from "drizzle-orm"
import { afterAll, describe, expect, it } from "vitest"
import { createDb, inOrg, withOrg } from "../src/db/client.js"
import { customers, invoices, organizations } from "../src/db/schema.js"

// Runs against the local Supabase stack's Postgres (DATABASE_URL in .env).
// Skipped when there's no database. Every write happens inside a transaction
// that is always rolled back, so local data is never changed.
try {
  process.loadEnvFile(".env")
} catch {
  // no .env — the suite is skipped below
}
const url = process.env.DATABASE_URL
const ROLLBACK = new Error("rollback")

describe.skipIf(!url)("Drizzle on the local database", () => {
  const { db, close } = createDb(url ?? "")
  afterAll(() => close())

  /** Runs fn in a transaction and always rolls it back. */
  async function inRolledBackTx(fn: Parameters<typeof db.transaction>[0]) {
    await db.transaction(async (tx) => {
      await fn(tx)
      throw ROLLBACK
    }).catch((error) => {
      if (error !== ROLLBACK) throw error
    })
  }

  it("reads through the generated schema", async () => {
    const [row] = await db.select({ n: count() }).from(organizations)
    expect(row!.n).toBeGreaterThan(0)
  })

  it("inOrg returns only that org's rows", async () => {
    const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1)
    const scoped = await db.select({ orgId: invoices.orgId }).from(invoices).where(inOrg(invoices, org!.id))
    expect(scoped.every((row) => row.orgId === org!.id)).toBe(true)
  })

  it("withOrg stamps the caller's org over any supplied one", () => {
    expect(withOrg("org-a", { name: "X", orgId: "org-b" })).toEqual({ name: "X", orgId: "org-a" })
    expect(() => withOrg("", { name: "X" })).toThrow()
  })

  it("a failed step rolls back the earlier writes in the same transaction", async () => {
    const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1)
    const name = `Rollback test ${crypto.randomUUID()}`

    await expect(
      db.transaction(async (tx) => {
        await tx.insert(customers).values(withOrg(org!.id, { name }))
        // Visible inside the transaction…
        const inside = await tx.select().from(customers).where(eq(customers.name, name))
        expect(inside).toHaveLength(1)
        // …then a later step fails.
        throw new Error("step 2 failed")
      }),
    ).rejects.toThrow("step 2 failed")

    // …so the customer was never created.
    expect(await db.select().from(customers).where(eq(customers.name, name))).toHaveLength(0)
  })

  it("database errors keep their Postgres code (for mapping to API errors)", async () => {
    await inRolledBackTx(async (tx) => {
      const error = await tx
        .insert(customers)
        .values(withOrg("00000000-0000-0000-0000-000000000000", { name: "No such org" }))
        .catch((e: unknown) => e)
      // Drizzle wraps the driver error; the Postgres code is on its cause.
      const code = (error as { cause?: { code?: string } }).cause?.code
      expect(code).toBe("23503") // foreign_key_violation: org doesn't exist
    })
  })
})
