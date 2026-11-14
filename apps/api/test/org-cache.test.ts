import { describe, expect, it } from "vitest"
import { MEMBERSHIP_CACHE_SECONDS, resolveRequestedOrg } from "../src/lib/auth.js"

const USER = "11111111-1111-1111-1111-111111111111"
const ORG = "22222222-2222-2222-2222-222222222222"
const OTHER_ORG = "33333333-3333-3333-3333-333333333333"

// Membership rows the fake database answers from, and a Map standing in for Redis.
function setup(members: { org: string; role: string; status: string }[]) {
  const store = new Map<string, string>()
  const sets: { key: string; value: string; ex?: number }[] = []
  let dbCalls = 0
  const redis = {
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string, opts?: { EX?: number }) => {
      store.set(key, value)
      sets.push({ key, value, ex: opts?.EX })
      return "OK"
    },
  }
  const db = {
    // The query filters by user, org and status; the fake checks the org from the SQL params.
    execute: async (query: { queryChunks?: unknown[] }) => {
      dbCalls++
      const params = JSON.stringify(query)
      const row = members.find((m) => params.includes(m.org) && m.status === "active")
      return row ? [{ role: row.role }] : []
    },
  }
  return {
    store,
    sets,
    calls: () => dbCalls,
    resolve: (org: string) =>
      resolveRequestedOrg(db as never, redis as never, USER, org),
  }
}

describe("resolveRequestedOrg", () => {
  it("allows an active member and caches the role for a minute", async () => {
    const t = setup([{ org: ORG, role: "owner", status: "active" }])
    expect(await t.resolve(ORG)).toEqual({ ok: true, orgId: ORG, role: "owner" })
    expect(t.sets).toEqual([{ key: `member:${USER}:${ORG}`, value: "owner", ex: MEMBERSHIP_CACHE_SECONDS }])
  })

  it("answers a second request from the cache without the database", async () => {
    const t = setup([{ org: ORG, role: "member", status: "active" }])
    await t.resolve(ORG)
    expect(await t.resolve(ORG)).toEqual({ ok: true, orgId: ORG, role: "member" })
    expect(t.calls()).toBe(1)
  })

  it("refuses an org the user isn't an active member of, and doesn't cache the refusal", async () => {
    const t = setup([{ org: ORG, role: "owner", status: "removed" }])
    expect(await t.resolve(ORG)).toMatchObject({ ok: false, status: 403 })
    expect(t.sets).toEqual([])
  })

  it("never reuses one org's answer for another", async () => {
    const t = setup([{ org: ORG, role: "owner", status: "active" }])
    await t.resolve(ORG)
    expect(await t.resolve(OTHER_ORG)).toMatchObject({ ok: false, status: 403 })
  })

  it("refuses a malformed org id without querying", async () => {
    const t = setup([])
    expect(await t.resolve("not-a-uuid")).toMatchObject({ ok: false, status: 403 })
    expect(t.calls()).toBe(0)
  })

  it("falls back to the database when Redis is down", async () => {
    const broken = {
      get: async () => {
        throw new Error("down")
      },
      set: async () => {
        throw new Error("down")
      },
    }
    const db = { execute: async () => [{ role: "owner" }] }
    expect(await resolveRequestedOrg(db as never, broken as never, USER, ORG)).toEqual({ ok: true, orgId: ORG, role: "owner" })
  })
})
