import { Hono } from "hono"
import { z } from "zod"
import type { AppEnv } from "../../context.js"
import { idempotency } from "../../middleware/idempotency.js"
import { requireCaller } from "../../middleware/require-caller.js"
import {
  archiveCustomerSchema,
  createCustomerSchema,
  customerPortalSchema,
  updateCustomerSchema,
} from "../../services/customer-schemas.js"
import * as customers from "../../services/customers.js"
import { serviceCtx, validate } from "./helpers.js"

// Domain 4 of API-WRITES-PLAN.md: customer writes. Thin wrappers over
// services/customers.ts, which the assistant's tools call too.

/** The fields the app needs back after a write (it refetches the rest). */
function summary(row: customers.CustomerRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    billing_email: row.billingEmail,
    is_archived: row.isArchived,
    portal_enabled: row.portalEnabled,
    portal_id: row.portalId,
    enrichment_status: row.enrichmentStatus,
  }
}

const idParam = z.object({ id: z.uuid() })

export const customerRoutes = new Hono<AppEnv>()
  .use(requireCaller)
  .use(idempotency)

  .post("/", validate("json", createCustomerSchema), async (c) => {
    const { customer } = await customers.createCustomer(await serviceCtx(c), c.req.valid("json"))
    return c.json({ customer: summary(customer) }, 201)
  })

  .patch("/:id", validate("param", idParam), validate("json", updateCustomerSchema), async (c) => {
    const { customer } = await customers.updateCustomer(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json"))
    return c.json({ customer: summary(customer) })
  })

  .post("/:id/archive", validate("param", idParam), validate("json", archiveCustomerSchema), async (c) => {
    const { customer } = await customers.archiveCustomer(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json").archived)
    return c.json({ customer: summary(customer) })
  })

  .post("/:id/portal", validate("param", idParam), validate("json", customerPortalSchema), async (c) => {
    const { customer } = await customers.setCustomerPortal(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json").enabled)
    return c.json({ portal_enabled: customer.portalEnabled, portal_id: customer.portalId })
  })

  .post("/:id/portal/regenerate", validate("param", idParam), async (c) => {
    const { customer } = await customers.regenerateCustomerPortal(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ portal_id: customer.portalId! })
  })

  .post("/:id/enrichment/cancel", validate("param", idParam), async (c) => {
    const { customer } = await customers.cancelEnrichment(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ customer: summary(customer) })
  })

  .delete("/:id/enrichment", validate("param", idParam), async (c) => {
    const { customer } = await customers.clearEnrichment(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ customer: summary(customer) })
  })

  .delete("/:id", validate("param", idParam), async (c) => {
    await customers.deleteCustomer(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ deleted: true })
  })
