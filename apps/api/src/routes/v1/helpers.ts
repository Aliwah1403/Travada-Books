import type { ApiErrorBody } from "@travada-books/core"
import { eq } from "drizzle-orm"
import type { Context, MiddlewareHandler, ValidationTargets } from "hono"
import { validator } from "hono/validator"
import type { z } from "zod"
import type { AppEnv } from "../../context.js"
import { users } from "../../db/schema.js"
import type { ServiceCtx } from "../../services/invoices.js"

/**
 * zod validation that answers in the shared error shape
 * ({ error, code: "VALIDATION_FAILED", field }). Built on Hono's own
 * validator rather than @hono/zod-validator, which would resolve the
 * repo-wide zod 3 (the worker's) instead of this workspace's zod 4.
 *
 * The declared in/out types are what the app's typed client (hc) sees:
 * z.input for what it sends, z.output for what handlers receive.
 */
export function validate<Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
): MiddlewareHandler<
  AppEnv,
  string,
  { in: { [K in Target]: z.input<Schema> }; out: { [K in Target]: z.output<Schema> } }
> {
  const handler = validator(target, (value, c) => {
    const result = schema.safeParse(value)
    if (result.success) return result.data as z.output<Schema>
    const issue = result.error.issues[0]
    const field = issue?.path.map(String).join(".") || undefined
    return c.json(
      {
        error: issue ? `${field ? `${field}: ` : ""}${issue.message}` : "Invalid request",
        code: "VALIDATION_FAILED",
        ...(field ? { field } : {}),
      } satisfies ApiErrorBody,
      422,
    )
  })
  return handler as unknown as MiddlewareHandler<
    AppEnv,
    string,
    { in: { [K in Target]: z.input<Schema> }; out: { [K in Target]: z.output<Schema> } }
  >
}

function isTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

function todayIn(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
}

/**
 * The service context for this request: the caller's org and user, today's
 * date in their timezone (the app sends X-User-Timezone; otherwise their
 * profile's, otherwise UTC), and the post-commit effects.
 */
export async function serviceCtx(c: Context<AppEnv>): Promise<ServiceCtx> {
  const { caller, deps } = c.var
  let tz = c.req.header("X-User-Timezone")
  if (!tz || !isTimezone(tz)) {
    const [user] = await deps.db.select({ timezone: users.timezone }).from(users).where(eq(users.id, caller.userId)).limit(1)
    tz = user?.timezone && isTimezone(user.timezone) ? user.timezone : "UTC"
  }
  return { db: deps.db as ServiceCtx["db"], orgId: caller.orgId, userId: caller.userId, today: todayIn(tz), timezone: tz, effects: deps.effects }
}
