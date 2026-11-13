import { Hono } from "hono"
import { z } from "zod"
import type { AppEnv } from "../../context.js"
import { idempotency } from "../../middleware/idempotency.js"
import { requireCaller } from "../../middleware/require-caller.js"
import { blocklistEntrySchema, deleteInboxItemsSchema, inboxStatusSchema, matchInboxSchema } from "../../services/inbox-schemas.js"
import * as svc from "../../services/inbox.js"
import { serviceCtx, validate } from "./helpers.js"

// Domain 6b of API-WRITES-PLAN.md: inbox documents, matching and the
// sender blocklist. Thin wrappers over services/inbox.ts.

function summary(row: svc.InboxRow) {
  return { id: row.id, status: row.status, transaction_id: row.transactionId }
}

const idParam = z.object({ id: z.uuid() })

export const inboxRoutes = new Hono<AppEnv>()
  .use(requireCaller)
  .use(idempotency)

  .post("/delete", validate("json", deleteInboxItemsSchema), async (c) => {
    const result = await svc.deleteInboxItems(await serviceCtx(c), c.req.valid("json").ids)
    return c.json({ deleted: result.deleted })
  })

  .post("/suggestions/:id/confirm", validate("param", idParam), async (c) => {
    const { item } = await svc.confirmSuggestion(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ item: summary(item) })
  })

  .post("/suggestions/:id/decline", validate("param", idParam), async (c) => {
    const { item } = await svc.declineSuggestion(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ item: summary(item) })
  })

  .post("/blocklist", validate("json", blocklistEntrySchema), async (c) => {
    const { type, value } = c.req.valid("json")
    const { entry } = await svc.addBlocklistEntry(await serviceCtx(c), type, value)
    return c.json({ entry: { id: entry.id, type: entry.type, value: entry.value, created_at: entry.createdAt } }, 201)
  })

  .delete("/blocklist/:id", validate("param", idParam), async (c) => {
    await svc.removeBlocklistEntry(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ deleted: true })
  })

  .post("/:id/status", validate("param", idParam), validate("json", inboxStatusSchema), async (c) => {
    const { item } = await svc.setInboxStatus(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json").status)
    return c.json({ item: summary(item) })
  })

  .post("/:id/match", validate("param", idParam), validate("json", matchInboxSchema), async (c) => {
    const { item } = await svc.matchTransaction(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json").transaction_id)
    return c.json({ item: summary(item) })
  })

  .post("/:id/unmatch", validate("param", idParam), async (c) => {
    const { item } = await svc.unmatchTransaction(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ item: summary(item) })
  })

  .post("/:id/retry", validate("param", idParam), async (c) => {
    const { item } = await svc.retryMatching(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ item: summary(item) })
  })
