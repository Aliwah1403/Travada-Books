import { Hono } from "hono"
import type { AppEnv } from "../context.js"

export const health = new Hono<AppEnv>()

// Liveness: Render's health check. Must not touch dependencies, or a Redis or
// Supabase blip would make Render restart a healthy process.
health.get("/", (c) => c.json({ status: "ok" }))

// Readiness: are the dependencies reachable? For humans and uptime monitors.
health.get("/ready", async (c) => {
  const { redis, serviceDb } = c.var.deps
  const timed = async (check: () => Promise<unknown>) => {
    const start = performance.now()
    try {
      await withTimeout(check(), 3_000)
      return { ok: true, ms: Math.round(performance.now() - start) }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  const [redisCheck, supabaseCheck] = await Promise.all([
    timed(() => redis.ping()),
    timed(async () => {
      const { error } = await serviceDb.from("organizations").select("id", { head: true, count: "exact" }).limit(1)
      if (error) throw new Error(error.message)
    }),
  ])

  const ok = redisCheck.ok && supabaseCheck.ok
  return c.json({ status: ok ? "ok" : "degraded", checks: { redis: redisCheck, supabase: supabaseCheck } }, ok ? 200 : 503)
})

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}
