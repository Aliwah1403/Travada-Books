import { Hono } from "hono"
import { z } from "zod"
import type { AppEnv } from "../../context.js"
import { idempotency } from "../../middleware/idempotency.js"
import { requireCaller } from "../../middleware/require-caller.js"
import { createStatementSchema } from "../../services/statement-schemas.js"
import * as statements from "../../services/statements.js"
import { serviceCtx, validate } from "./helpers.js"

// Domain 3 of API-WRITES-PLAN.md: generate, email and delete statements.
// Thin wrappers over services/statements.ts, which the assistant's tools call too.

/** The fields the app needs back after a write (it refetches the rest). */
function summary(row: statements.StatementRow) {
  return {
    id: row.id,
    token: row.token,
    customer_id: row.customerId,
    date_from: row.dateFrom,
    date_to: row.dateTo,
    opening_balance: Number(row.openingBalance),
    invoice_count: Array.isArray(row.snapshotData) ? row.snapshotData.length : 0,
    payment_count: Array.isArray(row.paymentsSnapshot) ? row.paymentsSnapshot.length : 0,
  }
}

const idParam = z.object({ id: z.uuid() })

export const statementRoutes = new Hono<AppEnv>()
  .use(requireCaller)
  .use(idempotency)

  .post("/", validate("json", createStatementSchema), async (c) => {
    const result = await statements.createStatement(await serviceCtx(c), c.req.valid("json"))
    return c.json({ statement: summary(result.statement), email: result.email ?? null }, 201)
  })

  .post("/:id/send", validate("param", idParam), async (c) => {
    const result = await statements.sendStatement(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ queued: result.queued })
  })

  .delete("/:id", validate("param", idParam), async (c) => {
    const result = await statements.deleteStatement(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ deleted: true, customer_id: result.statement.customerId })
  })
