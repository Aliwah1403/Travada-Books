import { Hono } from "hono"
import { z } from "zod"
import type { AppEnv } from "../../context.js"
import { idempotency } from "../../middleware/idempotency.js"
import { requireCaller } from "../../middleware/require-caller.js"
import { billFromInboxSchema, createBillSchema, setBillPaidSchema, updateBillSchema } from "../../services/bill-schemas.js"
import * as svc from "../../services/bills.js"
import { serviceCtx, validate } from "./helpers.js"

// Domain 6a of API-WRITES-PLAN.md: bills. Thin wrappers over services/bills.ts.

function summary(row: svc.BillRow) {
  return {
    id: row.id,
    vendor_name: row.vendorName,
    bill_number: row.billNumber,
    amount: Number(row.amount),
    currency: row.currency,
    due_date: row.dueDate,
    status: row.status,
    paid_at: row.paidAt,
  }
}

const idParam = z.object({ id: z.uuid() })

export const billRoutes = new Hono<AppEnv>()
  .use(requireCaller)
  .use(idempotency)

  .post("/", validate("json", createBillSchema), async (c) => {
    const { bill } = await svc.createBill(await serviceCtx(c), c.req.valid("json"))
    return c.json({ bill: summary(bill) }, 201)
  })

  .post("/from-inbox", validate("json", billFromInboxSchema), async (c) => {
    const { bill } = await svc.createBillFromInboxItem(await serviceCtx(c), c.req.valid("json").inbox_item_id)
    return c.json({ bill: summary(bill) }, 201)
  })

  .patch("/:id", validate("param", idParam), validate("json", updateBillSchema), async (c) => {
    const { bill } = await svc.updateBill(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json"))
    return c.json({ bill: summary(bill) })
  })

  .post("/:id/paid", validate("param", idParam), validate("json", setBillPaidSchema), async (c) => {
    const { paid, paid_on } = c.req.valid("json")
    const { bill } = await svc.setBillPaid(await serviceCtx(c), c.req.valid("param").id, paid, paid_on)
    return c.json({ bill: summary(bill) })
  })

  .delete("/:id", validate("param", idParam), async (c) => {
    await svc.deleteBill(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ deleted: true })
  })
