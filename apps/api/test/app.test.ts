import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose"
import { beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import type { Deps } from "../src/context.js"
import { createTokenVerifier } from "../src/lib/auth.js"
import { createFakeDb } from "./fake-db.js"

const SUPABASE_URL = "http://supabase.test"
const USER = "11111111-1111-1111-1111-111111111111"
const ORG = "22222222-2222-2222-2222-222222222222"

let privateKey: CryptoKey
let deps: Deps

// Signs a token the way Supabase Auth does (ES256, issuer + audience).
const sign = (claims: Record<string, unknown> = {}, opts: { issuer?: string; expired?: boolean } = {}) =>
  new SignJWT({ email: "owner@example.com", ...claims })
    .setProtectedHeader({ alg: "ES256", kid: "test" })
    .setSubject(USER)
    .setIssuer(opts.issuer ?? `${SUPABASE_URL}/auth/v1`)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime(opts.expired ? Math.floor(Date.now() / 1000) - 60 : "1h")
    .sign(privateKey)

// The org lookups are single SQL queries (lib/auth.ts); answer them from the
// tables. A query naming an org other than the user (X-Org-Id) is the
// membership check; otherwise it's the active-org lookup.
const orgLookup = (tables: Record<string, Record<string, unknown>[]>) => async (query: unknown) => {
  const named = (JSON.stringify(query).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? []).find(
    (id) => id !== USER,
  )
  if (named) {
    const member = tables.organization_members?.find((m) => m.user_id === USER && m.org_id === named && m.status === "active")
    return member ? [{ role: member.role }] : []
  }
  const user = tables.users?.find((u) => u.id === USER)
  if (!user) return []
  const member = tables.organization_members?.find(
    (m) => m.user_id === USER && m.org_id === user.active_org_id && m.status === "active",
  )
  return [{ active_org_id: user.active_org_id ?? null, org_id: member?.org_id ?? null, role: member?.role ?? null }]
}

function makeApp(tables: Record<string, Record<string, unknown>[]>) {
  const { db } = createFakeDb(tables)
  return createApp(
    { ...deps, serviceDb: db, db: { ...deps.db, execute: orgLookup(tables) } as unknown as Deps["db"] },
    { allowedOrigins: ["http://localhost:5173"] },
  )
}

const memberTables = (overrides: { status?: string; activeOrg?: string | null } = {}) => ({
  users: [{ id: USER, active_org_id: overrides.activeOrg === undefined ? ORG : overrides.activeOrg }],
  organization_members: [{ user_id: USER, org_id: ORG, role: "owner", status: overrides.status ?? "active" }],
  organizations: [{ id: ORG, name: "Acme Ltd" }],
})

beforeAll(async () => {
  const keys = await generateKeyPair("ES256")
  privateKey = keys.privateKey
  const jwk = { ...(await exportJWK(keys.publicKey)), kid: "test", alg: "ES256" }
  deps = {
    serviceDb: createFakeDb().db,
    redis: { ping: async () => "PONG", get: async () => null, set: async () => "OK", getDel: async () => null } as unknown as Deps["redis"],
    appUrl: "http://localhost:5173",
    effects: {
      sendInvoiceEmail: async () => ({ queued: false }),
      sendInvoiceReminder: async () => {},
      notifyInvoicePaid: async () => {},
      scheduleInvoiceSend: async () => {},
      sendQuoteEmail: async () => ({ queued: false }),
      sendStatementEmail: async () => ({ queued: false }),
      removeVaultFiles: async () => {},
      enrichTransactions: async () => {},
      processInboxItem: async () => {},
      notifyInbox: async () => {},
    },
    db: { execute: async () => [] } as unknown as Deps["db"],
    verifyToken: createTokenVerifier(SUPABASE_URL, createLocalJWKSet({ keys: [jwk] })),
    analytics: { capture: () => {}, captureError: () => {}, shutdown: async () => {} },
  }
})

describe("health", () => {
  it("answers liveness without touching dependencies", async () => {
    const res = await makeApp({}).request("/health")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: "ok" })
  })

  it("reports readiness of Redis and Supabase", async () => {
    const res = await makeApp({ organizations: [] }).request("/health/ready")
    expect(res.status).toBe(200)
    const body = (await res.json()) as { checks: Record<string, { ok: boolean }> }
    expect(body.checks.redis.ok).toBe(true)
    expect(body.checks.supabase.ok).toBe(true)
  })
})

describe("GET /v1/me", () => {
  it("rejects a request with no token", async () => {
    const res = await makeApp(memberTables()).request("/v1/me")
    expect(res.status).toBe(401)
  })

  it("rejects a garbage token", async () => {
    const res = await makeApp(memberTables()).request("/v1/me", { headers: { Authorization: "Bearer nope" } })
    expect(res.status).toBe(401)
  })

  it("rejects an expired token", async () => {
    const token = await sign({}, { expired: true })
    const res = await makeApp(memberTables()).request("/v1/me", { headers: { Authorization: `Bearer ${token}` } })
    expect(res.status).toBe(401)
  })

  it("rejects a token from another Supabase project", async () => {
    const token = await sign({}, { issuer: "http://other.test/auth/v1" })
    const res = await makeApp(memberTables()).request("/v1/me", { headers: { Authorization: `Bearer ${token}` } })
    expect(res.status).toBe(401)
  })

  it("returns 403 when the user has no active org", async () => {
    const token = await sign()
    const res = await makeApp(memberTables({ activeOrg: null })).request("/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(403)
  })

  it("returns 403 when the membership was revoked", async () => {
    const token = await sign()
    const res = await makeApp(memberTables({ status: "removed" })).request("/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(403)
  })

  it("uses the org the app names when the user is an active member of it", async () => {
    const token = await sign()
    const res = await makeApp(memberTables({ activeOrg: null })).request("/v1/me", {
      headers: { Authorization: `Bearer ${token}`, "X-Org-Id": ORG },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ org: { id: ORG }, role: "owner" })
  })

  it("refuses an org the app names that the user isn't a member of", async () => {
    const token = await sign()
    const res = await makeApp(memberTables()).request("/v1/me", {
      headers: { Authorization: `Bearer ${token}`, "X-Org-Id": "33333333-3333-3333-3333-333333333333" },
    })
    expect(res.status).toBe(403)
  })

  it("returns the user, org and role for a valid member", async () => {
    const token = await sign()
    const res = await makeApp(memberTables()).request("/v1/me", { headers: { Authorization: `Bearer ${token}` } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      user: { id: USER, email: "owner@example.com" },
      org: { id: ORG, name: "Acme Ltd" },
      role: "owner",
    })
  })
})

describe("CORS", () => {
  it("allows the app origin and not others", async () => {
    const app = makeApp({})
    const allowed = await app.request("/health", { headers: { Origin: "http://localhost:5173" } })
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://localhost:5173")
    const blocked = await app.request("/health", { headers: { Origin: "https://evil.example" } })
    expect(blocked.headers.get("access-control-allow-origin")).toBeNull()
  })

  it("lets the app send X-Org-Id", async () => {
    const res = await makeApp({}).request("/v1/transactions", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type,x-org-id",
      },
    })
    expect(res.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("x-org-id")
  })
})

describe("/v1 write routes", () => {
  const json = (token: string, body: unknown) => ({
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  it("reject a request with no token", async () => {
    for (const path of ["/v1/quotes", "/v1/invoices", "/v1/payments"]) {
      const res = await makeApp(memberTables()).request(path, { method: "POST", body: "{}" })
      expect(res.status, path).toBe(401)
    }
  })

  it("answer invalid input with VALIDATION_FAILED and the field", async () => {
    const token = await sign()
    const res = await makeApp(memberTables()).request("/v1/quotes", json(token, { customer_id: "not-a-uuid", action: "draft" }))
    expect(res.status).toBe(422)
    expect(await res.json()).toMatchObject({ code: "VALIDATION_FAILED", field: "customer_id" })
  })

  it("reject a malformed id before touching the database", async () => {
    const token = await sign()
    const res = await makeApp(memberTables()).request("/v1/quotes/123/accept", json(token, {}))
    expect(res.status).toBe(422)
    expect(await res.json()).toMatchObject({ code: "VALIDATION_FAILED", field: "id" })
  })
})
