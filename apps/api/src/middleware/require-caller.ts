import type { ApiErrorBody } from "@travada-books/core"
import { createMiddleware } from "hono/factory"
import type { AppEnv } from "../context.js"
import { resolveActiveOrg } from "../lib/auth.js"
import { scopeToOrg } from "../lib/scoped.js"

// Requires "Authorization: Bearer <Supabase access token>" from a signed-in
// user with an active org. Sets c.var.caller and c.var.db (org-scoped).
export const requireCaller = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization")
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null
  if (!token) {
    return c.json({ error: "Missing bearer token", code: "UNAUTHORIZED" } satisfies ApiErrorBody, 401)
  }

  const { verifyToken, serviceDb } = c.var.deps
  const identity = await verifyToken(token)
  if (!identity) {
    return c.json({ error: "Invalid or expired token", code: "UNAUTHORIZED" } satisfies ApiErrorBody, 401)
  }

  const org = await resolveActiveOrg(serviceDb, identity.userId)
  if (!org.ok) {
    return c.json(
      { error: org.error, code: org.status === 403 ? "FORBIDDEN" : "INTERNAL" } satisfies ApiErrorBody,
      org.status,
    )
  }

  c.set("caller", { ...identity, orgId: org.orgId, role: org.role })
  c.set("db", scopeToOrg(serviceDb, org.orgId))
  await next()
})
