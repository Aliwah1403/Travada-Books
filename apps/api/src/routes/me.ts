import { Hono } from "hono"
import type { AppEnv } from "../context.js"
import { requireCaller } from "../middleware/require-caller.js"

export const me = new Hono<AppEnv>()

me.use(requireCaller)

// Who the API thinks the caller is. Proves the login check end to end, and the
// app can use it later to confirm the API sees the same org it does.
me.get("/", async (c) => {
  const { caller } = c.var
  // organizations is keyed by id (it has no org_id), so it's read directly;
  // caller.orgId was already checked against an active membership.
  const { data: org, error } = await c.var.deps.serviceDb
    .from("organizations")
    .select("id, name")
    .eq("id", caller.orgId)
    .single()
  if (error) return c.json({ error: "Organization not found" }, 404)

  return c.json({ user: { id: caller.userId, email: caller.email }, org, role: caller.role })
})
