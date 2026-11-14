import { sql } from "drizzle-orm"
import type { Db } from "../db/client.js"
import type { Redis } from "./redis.js"
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose"

export type Caller = {
  userId: string
  email: string | null
  orgId: string
  role: "owner" | "member"
}

export type TokenVerifier = (token: string) => Promise<{ userId: string; email: string | null } | null>

// Supabase signs access tokens with an asymmetric key (ES256) and publishes the
// public half at /auth/v1/.well-known/jwks.json. Verifying against it needs no
// shared secret and no network call per request — jose caches the key set.
export function createTokenVerifier(supabaseUrl: string, keys?: JWTVerifyGetKey): TokenVerifier {
  const jwks = keys ?? createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
  const issuer = `${supabaseUrl}/auth/v1`

  return async (token) => {
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience: "authenticated" })
      if (!payload.sub) return null
      return { userId: payload.sub, email: typeof payload.email === "string" ? payload.email : null }
    } catch {
      return null
    }
  }
}

export type OrgResolution =
  | { ok: true; orgId: string; role: "owner" | "member" }
  | { ok: false; status: 403 | 500; error: string }

// Same rule as the edge functions' getCallerOrgId (_shared/auth.ts): the org is
// the user's active_org_id, and only while they still hold an active membership
// in it — active_org_id is denormalised and can outlive a revoked membership.
//
// One query on the API's Postgres pool rather than two supabase-js calls: this
// runs on every authenticated request, and each HTTPS call to Supabase from
// Render (Singapore → Sydney) cost a fresh TLS handshake.
export async function resolveActiveOrg(db: Pick<Db, "execute">, userId: string): Promise<OrgResolution> {
  let row: { active_org_id: string | null; org_id: string | null; role: string | null } | undefined
  try {
    const rows = await db.execute<{ active_org_id: string | null; org_id: string | null; role: string | null }>(sql`
      select u.active_org_id, m.org_id, m.role
      from public.users u
      left join public.organization_members m
        on m.user_id = u.id and m.org_id = u.active_org_id and m.status = 'active'
      where u.id = ${userId}::uuid
      limit 1
    `)
    row = rows[0]
  } catch (error) {
    console.error("[auth] org lookup failed:", error instanceof Error ? error.message : error)
    return { ok: false, status: 500, error: "Internal server error" }
  }

  if (!row?.active_org_id) {
    return { ok: false, status: 403, error: "No active organization membership" }
  }
  if (!row.org_id) {
    return { ok: false, status: 403, error: "Forbidden" }
  }
  return { ok: true, orgId: row.org_id, role: row.role === "owner" ? "owner" : "member" }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** How long a confirmed membership is trusted without asking the database again. */
export const MEMBERSHIP_CACHE_SECONDS = 60

/**
 * The org the app says it's working in (X-Org-Id), allowed only while the
 * user holds an active membership in it — the same right that lets them
 * switch to it. A confirmed membership is cached in Redis (next to the API)
 * for a minute, saving a round trip to the database on almost every request;
 * a revoked membership therefore stops working within a minute. Refusals are
 * never cached.
 *
 * Keyed by user *and* org, so switching orgs in the app can never reuse the
 * previous org's answer.
 */
export async function resolveRequestedOrg(
  db: Pick<Db, "execute">,
  redis: Pick<Redis, "get" | "set">,
  userId: string,
  orgId: string,
): Promise<OrgResolution> {
  if (!UUID.test(orgId)) return { ok: false, status: 403, error: "Forbidden" }
  const key = `member:${userId}:${orgId.toLowerCase()}`

  try {
    const cached = await redis.get(key)
    if (cached === "owner" || cached === "member") return { ok: true, orgId: orgId.toLowerCase(), role: cached }
  } catch (error) {
    // Redis down: fall through to the database.
    console.error("[auth] membership cache read failed:", error instanceof Error ? error.message : error)
  }

  let role: string | undefined
  try {
    const rows = await db.execute<{ role: string }>(sql`
      select m.role from public.organization_members m
      where m.user_id = ${userId}::uuid and m.org_id = ${orgId}::uuid and m.status = 'active'
      limit 1
    `)
    role = rows[0]?.role
  } catch (error) {
    console.error("[auth] membership lookup failed:", error instanceof Error ? error.message : error)
    return { ok: false, status: 500, error: "Internal server error" }
  }
  if (!role) return { ok: false, status: 403, error: "Forbidden" }

  const normalised = role === "owner" ? "owner" : "member"
  await redis.set(key, normalised, { EX: MEMBERSHIP_CACHE_SECONDS }).catch((error: unknown) => {
    console.error("[auth] membership cache write failed:", error instanceof Error ? error.message : error)
  })
  return { ok: true, orgId: orgId.toLowerCase(), role: normalised }
}
