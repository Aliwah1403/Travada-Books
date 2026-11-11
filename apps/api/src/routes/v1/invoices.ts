import { Hono } from "hono"
import { z } from "zod"
import type { AppEnv } from "../../context.js"
import { idempotency } from "../../middleware/idempotency.js"
import { requireCaller } from "../../middleware/require-caller.js"
import {
  invoiceMetaSchema,
  issueInvoiceSchema,
  recordPaymentSchema,
  recurringStatusSchema,
  saveInvoiceSchema,
} from "../../services/invoice-schemas.js"
import * as invoices from "../../services/invoices.js"
import { serviceCtx, validate } from "./helpers.js"

// Domain 1 of API-WRITES-PLAN.md: every invoice and payment write the app
// makes. Thin wrappers — the rules live in services/invoices.ts, which the
// assistant's tools call too. Chained so the app's typed client sees them.

type Row = Awaited<ReturnType<typeof invoices.getInvoiceRow>>

/** The fields the app needs back after a write (it refetches the rest). */
function summary(row: Row) {
  return {
    id: row.id,
    invoice_number: row.invoiceNumber,
    status: row.status,
    customer_id: row.customerId,
    customer_name: row.customerName,
    currency: row.currency,
    total: row.total == null ? null : Number(row.total),
    amount_paid: Number(row.amountPaid),
    issue_date: row.issueDate,
    due_date: row.dueDate,
    token: row.token,
    invoice_recurring_id: row.invoiceRecurringId,
  }
}

const idParam = z.object({ id: z.uuid() })

export const invoiceRoutes = new Hono<AppEnv>()
  .use(requireCaller)
  .use(idempotency)

  .post("/", validate("json", saveInvoiceSchema), async (c) => {
    const result = await invoices.createInvoice(await serviceCtx(c), c.req.valid("json"))
    return c.json({ invoice: summary(result.invoice), email: result.email ?? null, schedule: result.schedule ?? null }, 201)
  })

  .patch("/:id", validate("param", idParam), validate("json", saveInvoiceSchema), async (c) => {
    const result = await invoices.updateInvoice(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json"))
    return c.json({ invoice: summary(result.invoice), email: result.email ?? null, schedule: result.schedule ?? null })
  })

  .post("/:id/issue", validate("param", idParam), validate("json", issueInvoiceSchema), async (c) => {
    const result = await invoices.issueInvoice(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json").channel)
    return c.json({ invoice: summary(result.invoice), email: result.email ?? null })
  })

  .post("/:id/resend", validate("param", idParam), async (c) => {
    const result = await invoices.resendInvoiceEmail(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ queued: result.queued })
  })

  .post("/:id/remind", validate("param", idParam), async (c) => {
    const result = await invoices.sendReminder(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ invoice: summary(result.invoice) })
  })

  .post("/:id/duplicate", validate("param", idParam), async (c) => {
    const result = await invoices.duplicateInvoice(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ invoice: summary(result.invoice) }, 201)
  })

  .post("/:id/unschedule", validate("param", idParam), async (c) => {
    const result = await invoices.unscheduleInvoice(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ invoice: summary(result.invoice) })
  })

  .post("/:id/cancel", validate("param", idParam), async (c) => {
    const result = await invoices.cancelInvoice(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ invoice: summary(result.invoice) })
  })

  .post("/:id/reopen", validate("param", idParam), async (c) => {
    const result = await invoices.reopenInvoice(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ invoice: summary(result.invoice) })
  })

  .post("/:id/mark-paid", validate("param", idParam), async (c) => {
    const result = await invoices.markInvoicePaid(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ invoice: summary(result.invoice), payment_id: result.payment.id, notify: result.notify ?? null })
  })

  .patch("/:id/meta", validate("param", idParam), validate("json", invoiceMetaSchema), async (c) => {
    const result = await invoices.updateInvoiceMeta(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json"))
    return c.json({ invoice: summary(result.invoice) })
  })

  .delete("/:id", validate("param", idParam), async (c) => {
    const result = await invoices.deleteInvoice(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ deleted: true as const, id: result.invoice.id })
  })

export const recurringRoutes = new Hono<AppEnv>()
  .use(requireCaller)
  .post("/:id/status", validate("param", idParam), validate("json", recurringStatusSchema), async (c) => {
    const result = await invoices.setRecurringStatus(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json").status)
    return c.json({ series: result.series })
  })

export const paymentRoutes = new Hono<AppEnv>()
  .use(requireCaller)
  .use(idempotency)

  .post("/", validate("json", recordPaymentSchema), async (c) => {
    const result = await invoices.recordPayment(await serviceCtx(c), c.req.valid("json"))
    return c.json({ payment_id: result.payment.id, invoice: summary(result.invoice), notify: result.notify ?? null }, 201)
  })

  .delete("/:id", validate("param", idParam), async (c) => {
    const result = await invoices.deletePayment(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ deleted: true as const, invoice: summary(result.invoice) })
  })
