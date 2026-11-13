import { z } from "zod"
import { createStatementSchema } from "../../services/statement-schemas.js"
import type { StatementRow } from "../../services/statements.js"
import type { McpContext } from "../types.js"
import { defineTool, ToolError } from "../types.js"
import { formatMoney, listResult, must, page, pagination, uuid } from "../util.js"

// Statements of account for the assistant (ASSISTANT-PLAN §5), on the same
// services as the app's /v1/statements routes. Generating one is harmless (it
// only snapshots what's already there); emailing it is a separate, confirmed step.

const LIST_COLUMNS = "id, created_at, customer_id, date_from, date_to, opening_balance, email_status, customer_details"

type StatementListRow = {
  id: string
  created_at: string
  customer_id: string
  date_from: string
  date_to: string
  opening_balance: number
  email_status: string | null
  customer_details: { name?: string; email?: string | null; billing_email?: string | null } | null
}

/** Opening balance + invoices − payments, in the statement's currency. */
function balances(row: Pick<StatementRow, "openingBalance" | "snapshotData" | "paymentsSnapshot">, fallbackCurrency: string) {
  const invoices = (Array.isArray(row.snapshotData) ? row.snapshotData : []) as { total?: number | null; currency?: string }[]
  const payments = (Array.isArray(row.paymentsSnapshot) ? row.paymentsSnapshot : []) as { amount?: number; currency?: string | null }[]
  const opening = Number(row.openingBalance)
  const invoiced = invoices.reduce((s, inv) => s + Number(inv.total ?? 0), 0)
  const paid = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const currency = invoices[0]?.currency ?? payments[0]?.currency ?? fallbackCurrency
  return { currency, opening, invoiced, paid, closing: Math.round((opening + invoiced - paid) * 100) / 100, invoices: invoices.length, payments: payments.length }
}

const period = (s: { date_from: string; date_to: string }) => `${s.date_from} to ${s.date_to}`

async function loadStatement(ctx: McpContext, id: string) {
  return must(await ctx.db.select("statements", LIST_COLUMNS).eq("id", id).maybeSingle(), "Statement") as unknown as StatementListRow
}

export const statementTools = [
  defineTool({
    name: "statements_list",
    title: "List statements",
    description: "Statements of account already generated, newest first, optionally for one customer, with whether each was emailed.",
    kind: "read",
    input: { customer_id: uuid("Customer").optional(), ...pagination },
    run: async (args, ctx) => {
      const paging = page(args)
      let query = ctx.db.select("statements", LIST_COLUMNS)
      if (args.customer_id) query = query.eq("customer_id", args.customer_id)
      const rows = must(await query.order("created_at", { ascending: false }).range(paging.from, paging.to), "List statements") as unknown as StatementListRow[]
      return {
        data: listResult(
          rows.map(({ customer_details, ...r }) => ({
            ...r,
            customer_name: customer_details?.name ?? null,
            app_url: `${ctx.appUrl}/statements/${r.id}`,
          })),
          paging,
        ),
      }
    },
  }),

  defineTool({
    name: "statements_create",
    title: "Generate statement",
    description:
      "Generate a statement of account for a customer over a period: the invoices issued in it, payments received in it, and the balance carried in from before. It isn't emailed — use statements_send after showing the user the balance.",
    kind: "write",
    input: {
      customer_id: uuid("Customer"),
      date_from: z.iso.date().describe("First day of the period, YYYY-MM-DD"),
      date_to: z.iso.date().describe("Last day of the period, YYYY-MM-DD"),
      notes: z.string().max(2000).optional().describe("Message shown at the bottom of the statement"),
      include_pdf: z.boolean().optional().describe("Attach a PDF when it's emailed (default true)"),
    },
    run: async (args, ctx) => {
      const { statement } = await ctx.statements.create(createStatementSchema.parse({ ...args, send: false }))
      const b = balances(statement, ctx.org.baseCurrency)
      const money = (n: number) => formatMoney(n, b.currency, ctx.user.locale)
      const name = (statement.customerDetails as { name?: string } | null)?.name ?? "the customer"
      return {
        data: {
          id: statement.id,
          period: period({ date_from: statement.dateFrom, date_to: statement.dateTo }),
          currency: b.currency,
          opening_balance: b.opening,
          invoiced: b.invoiced,
          paid: b.paid,
          closing_balance: b.closing,
          invoice_count: b.invoices,
          payment_count: b.payments,
          public_url: `${ctx.appUrl}/s/${statement.token}`,
          app_url: `${ctx.appUrl}/statements/${statement.id}`,
        },
        entity: { type: "statement", id: statement.id },
        summary: `Generated a statement for ${name} (${period({ date_from: statement.dateFrom, date_to: statement.dateTo })}), balance ${money(b.closing)}`,
      }
    },
  }),

  defineTool({
    name: "statements_send",
    title: "Email statement",
    description: "Email a generated statement to the customer (also retries a failed send). Always tell the user the balance first.",
    kind: "write",
    confirm: true,
    input: { id: uuid("Statement") },
    describe: async ({ id }, ctx) => {
      const s = await loadStatement(ctx, id)
      const email = s.customer_details?.billing_email || s.customer_details?.email
      const name = s.customer_details?.name ?? "the customer"
      if (!email) throw new ToolError(`${name} had no email address when this statement was made; add one and generate a new statement.`)
      return `Email the statement for ${period(s)} to ${name} at ${email}?`
    },
    run: async ({ id }, ctx) => {
      const { queued } = await ctx.statements.send(id)
      const s = await ctx.statements.get(id)
      return {
        data: { email: queued ? "sending with PDF" : "sent", public_url: `${ctx.appUrl}/s/${s.token}` },
        entity: { type: "statement", id },
        summary: `Emailed the statement for ${period({ date_from: s.dateFrom, date_to: s.dateTo })}`,
      }
    },
  }),

  defineTool({
    name: "statements_delete",
    title: "Delete statement",
    description: "Permanently delete a statement and its PDF. Its public link stops working.",
    kind: "destructive",
    confirm: true,
    input: { id: uuid("Statement") },
    describe: async ({ id }, ctx) => {
      const s = await loadStatement(ctx, id)
      const sent = s.email_status ? " It was already emailed; the customer's link will stop working." : ""
      return `Delete the statement for ${s.customer_details?.name ?? "this customer"} (${period(s)})?${sent} This can't be undone.`
    },
    run: async ({ id }, ctx) => {
      const { statement } = await ctx.statements.remove(id)
      return {
        data: { deleted: true, id },
        entity: { type: "statement", id },
        summary: `Deleted the statement for ${period({ date_from: statement.dateFrom, date_to: statement.dateTo })}`,
      }
    },
  }),
]
