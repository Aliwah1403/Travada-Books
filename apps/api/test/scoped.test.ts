import { describe, expect, it } from "vitest"
import { scopeToOrg } from "../src/lib/scoped.js"
import { createFakeDb } from "./fake-db.js"

const ORG = "22222222-2222-2222-2222-222222222222"

describe("scopeToOrg", () => {
  it("filters every select, update and delete by org_id", async () => {
    const { db, calls } = createFakeDb()
    const scoped = scopeToOrg(db, ORG)

    await scoped.select("invoices", "id")
    await scoped.update("invoices", { status: "paid" })
    await scoped.delete("invoices")

    const orgFilters = calls.filter((call) => call.method === "eq" && call.args[0] === "org_id")
    expect(orgFilters).toHaveLength(3)
    expect(orgFilters.every((call) => call.args[1] === ORG)).toBe(true)
  })

  it("stamps org_id on inserted rows, overriding any supplied value", async () => {
    const { db, calls } = createFakeDb()
    await scopeToOrg(db, ORG).insert("customers", [{ name: "A", org_id: "someone-else" }, { name: "B" }])

    const insert = calls.find((call) => call.method === "insert")
    expect(insert?.args[0]).toEqual([
      { name: "A", org_id: ORG },
      { name: "B", org_id: ORG },
    ])
  })

  it("refuses to move a row to another org on update", async () => {
    const { db, calls } = createFakeDb()
    await scopeToOrg(db, ORG).update("customers", { name: "A", org_id: "someone-else" })

    const update = calls.find((call) => call.method === "update")
    expect(update?.args[0]).toEqual({ name: "A" })
  })

  it("passes p_org_id to RPCs, overriding any supplied value", async () => {
    const { db, calls } = createFakeDb()
    await scopeToOrg(db, ORG).rpc("global_search", { p_term: "acme", p_org_id: "someone-else" })

    expect(calls.find((call) => call.table === "(rpc)")?.args[0]).toEqual({ p_term: "acme", p_org_id: ORG })
  })

  it("throws without an org id", () => {
    expect(() => scopeToOrg(createFakeDb().db, "")).toThrow()
  })
})
