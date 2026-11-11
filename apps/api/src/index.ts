import { serve } from "@hono/node-server"
import { createApp } from "./app.js"
import { createDb } from "./db/client.js"
import { createEffects } from "./services/effects.js"
import { parseEnv } from "./env.js"
import { createTokenVerifier } from "./lib/auth.js"
import { createAnalytics } from "./lib/posthog.js"
import { connectRedis } from "./lib/redis.js"
import { createServiceClient } from "./lib/supabase.js"

const env = parseEnv(process.env)

const redis = await connectRedis(env.REDIS_URL)
const database = createDb(env.DATABASE_URL)
const analytics = createAnalytics(env.POSTHOG_API_KEY, env.POSTHOG_HOST)
const app = createApp(
  {
    serviceDb: createServiceClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
    db: database.db,
    redis,
    verifyToken: createTokenVerifier(env.SUPABASE_URL),
    analytics,
    appUrl: env.APP_URL,
    effects: createEffects({
      supabaseUrl: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      workerSecret: env.WORKER_SHARED_SECRET,
      triggerSecretKey: env.TRIGGER_SECRET_KEY,
    }),
  },
  { allowedOrigins: env.ALLOWED_ORIGINS, logRequests: env.NODE_ENV !== "test" },
)

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[api] listening on http://localhost:${info.port} (${env.NODE_ENV}, Supabase ${env.SUPABASE_URL})`)
})

// Render sends SIGTERM on deploy; finish in-flight requests, then flush
// PostHog and close Redis.
let shuttingDown = false
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`[api] ${signal} received, shutting down`)
    server.close(async () => {
      await analytics.shutdown().catch(() => {})
      await redis.quit().catch(() => {})
      await database.close().catch(() => {})
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  })
}
