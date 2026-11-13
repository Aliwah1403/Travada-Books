import { Hono } from "hono"
import { z } from "zod"
import type { AppEnv } from "../../context.js"
import { idempotency } from "../../middleware/idempotency.js"
import { requireCaller } from "../../middleware/require-caller.js"
import {
  addAttachmentsSchema,
  bulkDeleteTransactionsSchema,
  bulkUpdateTransactionsSchema,
  createCategoryRuleSchema,
  createCategorySchema,
  createTransactionSchema,
  updateCategorySchema,
  updateTransactionSchema,
} from "../../services/transaction-schemas.js"
import * as svc from "../../services/transactions.js"
import { serviceCtx, validate } from "./helpers.js"

// Domain 5 of API-WRITES-PLAN.md: transactions, their categories and
// category rules. Thin wrappers over services/transactions.ts, which the
// assistant's tools call too.

function summary(row: svc.TransactionRow) {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    amount: Number(row.amount),
    currency: row.currency,
    base_amount: row.baseAmount == null ? null : Number(row.baseAmount),
    base_currency: row.baseCurrency,
    type: row.type,
    status: row.status,
    category_id: row.categoryId,
    invoice_id: row.invoiceId,
  }
}

const idParam = z.object({ id: z.uuid() })

export const transactionRoutes = new Hono<AppEnv>()
  .use(requireCaller)
  .use(idempotency)

  .post("/", validate("json", createTransactionSchema), async (c) => {
    const { transaction } = await svc.createTransaction(await serviceCtx(c), c.req.valid("json"))
    return c.json({ transaction: summary(transaction) }, 201)
  })

  .post("/bulk-update", validate("json", bulkUpdateTransactionsSchema), async (c) => {
    const { ids, update } = c.req.valid("json")
    const result = await svc.bulkUpdateTransactions(await serviceCtx(c), ids, update)
    return c.json({ updated: result.updated })
  })

  .post("/bulk-delete", validate("json", bulkDeleteTransactionsSchema), async (c) => {
    const result = await svc.deleteTransactions(await serviceCtx(c), c.req.valid("json").ids)
    return c.json({ deleted: result.deleted })
  })

  .delete("/attachments/:id", validate("param", idParam), async (c) => {
    await svc.deleteAttachment(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ deleted: true })
  })

  .patch("/:id", validate("param", idParam), validate("json", updateTransactionSchema), async (c) => {
    const { transaction } = await svc.updateTransaction(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json"))
    return c.json({ transaction: summary(transaction) })
  })

  .post("/:id/attachments", validate("param", idParam), validate("json", addAttachmentsSchema), async (c) => {
    const { attachments } = await svc.addAttachments(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json").attachments)
    return c.json({ attachments: attachments.map((a) => ({ id: a.id, file_path: a.filePath, file_name: a.fileName })) }, 201)
  })

  .delete("/:id", validate("param", idParam), async (c) => {
    await svc.deleteTransactions(await serviceCtx(c), [c.req.valid("param").id])
    return c.json({ deleted: true })
  })

export const transactionCategoryRoutes = new Hono<AppEnv>()
  .use(requireCaller)
  .use(idempotency)

  .post("/", validate("json", createCategorySchema), async (c) => {
    const { category } = await svc.createCategory(await serviceCtx(c), c.req.valid("json"))
    return c.json({ category: { id: category.id, name: category.name, slug: category.slug, color: category.color } }, 201)
  })

  .patch("/:id", validate("param", idParam), validate("json", updateCategorySchema), async (c) => {
    const { category } = await svc.updateCategory(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json"))
    return c.json({ category: { id: category.id, name: category.name, slug: category.slug, color: category.color } })
  })

  .delete("/:id", validate("param", idParam), async (c) => {
    await svc.deleteCategory(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ deleted: true })
  })

export const categoryRuleRoutes = new Hono<AppEnv>()
  .use(requireCaller)
  .use(idempotency)

  .post("/", validate("json", createCategoryRuleSchema), async (c) => {
    const { rule, applied } = await svc.createCategoryRule(await serviceCtx(c), c.req.valid("json"))
    return c.json({ rule: { id: rule.id, pattern: rule.pattern, category_id: rule.categoryId }, applied }, 201)
  })

  .delete("/:id", validate("param", idParam), async (c) => {
    await svc.deleteCategoryRule(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ deleted: true })
  })
