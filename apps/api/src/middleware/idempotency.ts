import type { ApiErrorBody } from "@travada-books/core"
import { createMiddleware } from "hono/factory"
import type { AppEnv } from "../context.js"

// Idempotency-Key support for mutating routes (API-WRITES-PLAN.md §5).
// A retried request with the same key gets the first response replayed
// instead of running again — a double-clicked "Send", a flaky network retry
// or a webhook redelivery can't send an invoice twice.
//
// Keys are per user and org, kept 24h. While the first request is still
// running, a duplicate gets 409. Server errors (5xx) aren't stored, so a
// genuine failure can be retried with the same key.

const TTL_SECONDS = 24 * 60 * 60
const IN_FLIGHT = "__in_flight__"

export const idempotency = createMiddleware<AppEnv>(async (c, next) => {
  const key = c.req.header("Idempotency-Key")
  if (!key || c.req.method === "GET") return next()
  if (key.length > 200) {
    return c.json({ error: "Idempotency-Key is too long", code: "VALIDATION_FAILED" } satisfies ApiErrorBody, 400)
  }

  const { redis } = c.var.deps
  const { orgId, userId } = c.var.caller
  const storeKey = `idem:${orgId}:${userId}:${c.req.method}:${c.req.path}:${key}`

  const claimed = await redis.set(storeKey, IN_FLIGHT, { NX: true, EX: TTL_SECONDS })
  if (claimed === null) {
    const stored = await redis.get(storeKey)
    if (stored && stored !== IN_FLIGHT) {
      const { status, body } = JSON.parse(stored) as { status: number; body: unknown }
      c.header("Idempotent-Replay", "true")
      return c.json(body as object, status as 200)
    }
    return c.json(
      { error: "This request is already being processed.", code: "CONFLICT" } satisfies ApiErrorBody,
      409,
    )
  }

  try {
    await next()
  } catch (error) {
    await redis.del(storeKey)
    throw error
  }

  if (c.res.status >= 500) {
    await redis.del(storeKey)
    return
  }
  const body = await c.res.clone().json().catch(() => null)
  await redis.set(storeKey, JSON.stringify({ status: c.res.status, body }), { EX: TTL_SECONDS })
})
