import type { ApiErrorBody } from "@travada-books/core"
import { createMiddleware } from "hono/factory"
import { endTime, startTime } from "hono/timing"
import type { AppEnv } from "../context.js"
import { resolveActiveOrg, resolveRequestedOrg } from "../lib/auth.js"
import { scopeToOrg } from "../lib/scoped.js"

// Requires "Authorization: Bearer <Supabase access token>" from a signed-in
// user with an active org (or an active membership in the X-Org-Id org).
// Sets c.var.caller and c.var.db (org-scoped).
export const requireCaller = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization")
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null
  if (!token) {
    return c.json({ error: "Missing bearer token", code: "UNAUTHORIZED" } satisfies ApiErrorBody, 401)
  }

  const { verifyToken, serviceDb, db, redis } = c.var.deps
  startTime(c, "auth")
  const identity = await verifyToken(token)
  endTime(c, "auth")
  if (!identity) {
    return c.json({ error: "Invalid or expired token", code: "UNAUTHORIZED" } satisfies ApiErrorBody, 401)
  }

  startTime(c, "org")
  // The app names its org (X-Org-Id) so the membership check can be cached;
  // other clients (the assistant, MCP) fall back to the user's active org.
  const requestedOrg = c.req.header("X-Org-Id")
  const org = requestedOrg
    ? await resolveRequestedOrg(db, redis, identity.userId, requestedOrg)
    : await resolveActiveOrg(db, identity.userId)
  endTime(c, "org")
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
