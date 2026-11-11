import type { SupabaseClient } from "@supabase/supabase-js"
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
export async function resolveActiveOrg(db: SupabaseClient, userId: string): Promise<OrgResolution> {
  const { data: user, error: userError } = await db
    .from("users")
    .select("active_org_id")
    .eq("id", userId)
    .maybeSingle()

  if (userError) {
    console.error("[auth] user lookup failed:", userError.message)
    return { ok: false, status: 500, error: "Internal server error" }
  }
  if (!user?.active_org_id) {
    return { ok: false, status: 403, error: "No active organization membership" }
  }

  const { data: member, error: memberError } = await db
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", userId)
    .eq("org_id", user.active_org_id)
    .eq("status", "active")
    .maybeSingle()

  if (memberError) {
    console.error("[auth] membership lookup failed:", memberError.message)
    return { ok: false, status: 500, error: "Internal server error" }
  }
  if (!member) {
    return { ok: false, status: 403, error: "Forbidden" }
  }

  return { ok: true, orgId: member.org_id, role: member.role === "owner" ? "owner" : "member" }
}
