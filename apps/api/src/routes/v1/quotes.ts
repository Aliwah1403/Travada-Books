import { Hono } from "hono"
import { z } from "zod"
import type { AppEnv } from "../../context.js"
import { idempotency } from "../../middleware/idempotency.js"
import { requireCaller } from "../../middleware/require-caller.js"
import { declineQuoteSchema, issueQuoteSchema, quoteMetaSchema, saveQuoteSchema } from "../../services/quote-schemas.js"
import * as quotes from "../../services/quotes.js"
import { serviceCtx, validate } from "./helpers.js"

// Domain 2 of API-WRITES-PLAN.md: every quote write the app makes, plus
// accept/decline on the customer's behalf and quote → invoice. Thin wrappers
// over services/quotes.ts, which the assistant's tools call too.

/** The fields the app needs back after a write (it refetches the rest). */
function summary(row: quotes.QuoteRow) {
  return {
    id: row.id,
    quote_number: row.quoteNumber,
    status: row.status,
    customer_id: row.customerId,
    customer_name: row.customerName,
    currency: row.currency,
    total: row.total == null ? null : Number(row.total),
    line_item_count: Array.isArray(row.lineItems) ? row.lineItems.length : 0,
    issue_date: row.issueDate,
    valid_until: row.validUntil,
    token: row.token,
  }
}

function invoiceRef(invoice: { id: string; invoiceNumber: string | null; status: string }) {
  return { id: invoice.id, invoice_number: invoice.invoiceNumber, status: invoice.status }
}

const idParam = z.object({ id: z.uuid() })

export const quoteRoutes = new Hono<AppEnv>()
  .use(requireCaller)
  .use(idempotency)

  .post("/", validate("json", saveQuoteSchema), async (c) => {
    const result = await quotes.createQuote(await serviceCtx(c), c.req.valid("json"))
    return c.json({ quote: summary(result.quote), email: result.email ?? null }, 201)
  })

  .patch("/:id", validate("param", idParam), validate("json", saveQuoteSchema), async (c) => {
    const result = await quotes.updateQuote(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json"))
    return c.json({ quote: summary(result.quote), email: result.email ?? null })
  })

  .post("/:id/issue", validate("param", idParam), validate("json", issueQuoteSchema), async (c) => {
    const result = await quotes.issueQuote(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json").channel)
    return c.json({ quote: summary(result.quote), email: result.email ?? null })
  })

  .post("/:id/resend", validate("param", idParam), async (c) => {
    const result = await quotes.resendQuoteEmail(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ queued: result.queued })
  })

  .post("/:id/duplicate", validate("param", idParam), async (c) => {
    const result = await quotes.duplicateQuote(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ quote: summary(result.quote) }, 201)
  })

  .post("/:id/accept", validate("param", idParam), async (c) => {
    const result = await quotes.acceptQuote(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ quote: summary(result.quote), invoice: invoiceRef(result.invoice) })
  })

  .post("/:id/decline", validate("param", idParam), validate("json", declineQuoteSchema), async (c) => {
    const result = await quotes.declineQuote(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json").reason)
    return c.json({ quote: summary(result.quote) })
  })

  .post("/:id/convert", validate("param", idParam), async (c) => {
    const result = await quotes.convertQuoteToInvoice(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ quote: summary(result.quote), invoice: invoiceRef(result.invoice), created: result.created }, result.created ? 201 : 200)
  })

  .patch("/:id/meta", validate("param", idParam), validate("json", quoteMetaSchema), async (c) => {
    const result = await quotes.updateQuoteMeta(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json"))
    return c.json({ quote: summary(result.quote) })
  })

  .delete("/:id", validate("param", idParam), async (c) => {
    const result = await quotes.deleteQuote(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ deleted: true as const, id: result.quote.id })
  })
