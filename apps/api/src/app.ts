import { Hono } from "hono"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"
import type { ApiErrorBody } from "@travada-books/core"
import type { AppEnv, Deps } from "./context.js"
import { ServiceError } from "./lib/errors.js"
import { health } from "./routes/health.js"
import { mcp } from "./routes/mcp.js"
import { me } from "./routes/me.js"
import { invoiceRoutes, paymentRoutes, recurringRoutes } from "./routes/v1/invoices.js"
import { customerRoutes } from "./routes/v1/customers.js"
import { quoteRoutes } from "./routes/v1/quotes.js"
import { statementRoutes } from "./routes/v1/statements.js"

export function createApp(deps: Deps, options: { allowedOrigins: string[]; logRequests?: boolean }) {
  const app = new Hono<AppEnv>()

  if (options.logRequests) app.use(logger())
  app.use(secureHeaders())
  app.use(
    cors({
      origin: options.allowedOrigins,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "X-User-Timezone"],
      maxAge: 86_400,
    }),
  )
  app.use(async (c, next) => {
    c.set("deps", deps)
    await next()
  })

  // Chained so the route types are kept: AppType (below) is what the app's
  // typed client (hc) is built from.
  const routes = app
    .route("/health", health)
    .route("/v1/me", me)
    .route("/v1/invoices", invoiceRoutes)
    .route("/v1/invoice-recurring", recurringRoutes)
    .route("/v1/payments", paymentRoutes)
    .route("/v1/quotes", quoteRoutes)
    .route("/v1/statements", statementRoutes)
    .route("/v1/customers", customerRoutes)
    .route("/mcp", mcp)

  // Every error leaves as an ApiErrorBody ({ error, code, field? }) from
  // @travada-books/core, so the app handles them one way.
  app.notFound((c) => c.json({ error: "Not found", code: "NOT_FOUND" } satisfies ApiErrorBody, 404))
  app.onError((error, c) => {
    if (error instanceof ServiceError) return c.json(error.toBody(), error.status)
    if (error instanceof HTTPException) return error.getResponse()
    console.error("[api] unhandled error:", error)
    deps.analytics.captureError(error, { path: c.req.path, method: c.req.method })
    return c.json({ error: "Something went wrong. Please try again.", code: "INTERNAL" } satisfies ApiErrorBody, 500)
  })

  return routes
}

/** The API's route types, for the app's typed client (`hc<AppType>`). */
export type AppType = ReturnType<typeof createApp>
