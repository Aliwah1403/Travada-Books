import { Hono } from "hono"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"
import type { AppEnv, Deps } from "./context.js"
import { health } from "./routes/health.js"
import { mcp } from "./routes/mcp.js"
import { me } from "./routes/me.js"

export function createApp(deps: Deps, options: { allowedOrigins: string[]; logRequests?: boolean }) {
  const app = new Hono<AppEnv>()

  if (options.logRequests) app.use(logger())
  app.use(secureHeaders())
  app.use(
    cors({
      origin: options.allowedOrigins,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type"],
      maxAge: 86_400,
    }),
  )
  app.use(async (c, next) => {
    c.set("deps", deps)
    await next()
  })

  app.route("/health", health)
  app.route("/v1/me", me)
  app.route("/mcp", mcp)

  app.notFound((c) => c.json({ error: "Not found" }, 404))
  app.onError((error, c) => {
    if (error instanceof HTTPException) return error.getResponse()
    console.error("[api] unhandled error:", error)
    deps.analytics.captureError(error, { path: c.req.path, method: c.req.method })
    return c.json({ error: "Internal server error" }, 500)
  })

  return app
}
