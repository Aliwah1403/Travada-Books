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

function makeApp(tables: Record<string, Record<string, unknown>[]>) {
  const { db } = createFakeDb(tables)
  return createApp({ ...deps, serviceDb: db }, { allowedOrigins: ["http://localhost:5173"] })
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
    redis: { ping: async () => "PONG" },
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
})
