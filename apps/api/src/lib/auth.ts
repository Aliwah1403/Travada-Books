import { sql } from "drizzle-orm"
import type { Db } from "../db/client.js"
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
