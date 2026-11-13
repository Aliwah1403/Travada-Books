import { z } from "zod"
import type { McpContext } from "../types.js"
import { defineTool, ToolError } from "../types.js"
import { dateRange, formatMoney, likeTerm, listResult, must, page, pagination, uuid } from "../util.js"

const INVOICE_STATUSES = ["draft", "scheduled", "unpaid", "partially_paid", "overdue", "paid", "canceled"] as const

const LIST_COLUMNS =
  "id, invoice_number, status, customer_id, customer_name, issue_date, due_date, currency, total, amount_paid, sent_at, paid_at, viewed_at"
const DETAIL_COLUMNS =
  "id, invoice_number, status, customer_id, customer_name, token, issue_date, due_date, currency, line_items, subtotal, tax_amount, vat_rate, discount, discount_percent, total, amount_paid, note, payment_details, sent_at, sent_via, paid_at, viewed_at, accept_payments, email_status, email_error, quote_id, invoice_recurring_id, last_reminder_sent_at, created_at, updated_at"

type InvoiceRow = { id: string; invoice_number: string | null; status: string; currency: string; total: number | null; amount_paid: number | null; customer_name: string | null; token: string | null }

export async function loadInvoice(ctx: McpContext, id: string, columns = DETAIL_COLUMNS) {
  return must(await ctx.db.select("invoices", columns).eq("id", id).maybeSingle(), "Invoice") as unknown as InvoiceRow &
    Record<string, unknown>
}

export const invoiceLabel = (inv: { invoice_number: string | null; id: string }) => inv.invoice_number ?? `draft ${inv.id.slice(0, 8)}`

export const invoiceTools = [
  defineTool({
    name: "invoices_list",
    title: "List invoices",
    description:
      "List invoices, newest first, with status, totals and amount paid. Filter by status, customer, issue date range, or search the invoice number and customer name.",
    kind: "read",
    input: {
      status: z.array(z.enum(INVOICE_STATUSES)).optional().describe("Only these statuses"),
      customer_id: uuid("Customer").optional(),
      q: z.string().optional().describe("Search invoice number or customer name"),
      issued_from: z.iso.date().optional().describe("Issue date on or after, YYYY-MM-DD"),
      issued_to: z.iso.date().optional().describe("Issue date on or before, YYYY-MM-DD"),
      ...pagination,
    },
    run: async (args, ctx) => {
      const paging = page(args)
      let query = ctx.db.select("invoices", LIST_COLUMNS)
      if (args.status?.length) query = query.in("status", args.status)
      if (args.customer_id) query = query.eq("customer_id", args.customer_id)
      if (args.q) query = query.or(`invoice_number.ilike.${likeTerm(args.q)},customer_name.ilike.${likeTerm(args.q)}`)
      if (args.issued_from) query = query.gte("issue_date", args.issued_from)
      if (args.issued_to) query = query.lte("issue_date", args.issued_to)
      const rows = must(await query.order("created_at", { ascending: false }).range(paging.from, paging.to), "List invoices")
      return { data: listResult(rows, paging) }
    },
  }),

  defineTool({
    name: "invoices_get",
    title: "Get invoice",
    description: "Full invoice: line items, totals, payments recorded so far, delivery status, and links to the invoice in Travada and its public page.",
    kind: "read",
    input: { id: uuid("Invoice") },
    run: async ({ id }, ctx) => {
      const { token, ...invoice } = await loadInvoice(ctx, id)
      const payments = must(
        await ctx.db
          .select("invoice_payments", "id, amount, currency, paid_at, method, reference, source")
          .eq("invoice_id", id)
          .order("paid_at", { ascending: false }),
        "Invoice payments",
      )
      return {
        data: {
          ...invoice,
          balance_due: Number(invoice.total ?? 0) - Number(invoice.amount_paid ?? 0),
          payments,
          app_url: `${ctx.appUrl}/invoices/${id}`,
          // Drafts have no public page yet.
          public_url: token && invoice.status !== "draft" ? `${ctx.appUrl}/i/${token}` : null,
        },
      }
    },
  }),

  defineTool({
    name: "invoices_outstanding",
    title: "Outstanding invoices",
    description:
      "What customers still owe: count and total of unpaid and overdue invoices (in the org's base currency) and the largest ones. Use for 'who owes me money' or 'what's overdue'.",
    kind: "read",
    input: {},
    run: async (_args, ctx) => {
      const [outstanding, overdue] = await Promise.all([
        ctx.db.rpc("get_outstanding_invoices"),
        ctx.db.rpc("get_overdue_invoices"),
      ])
      return {
        data: {
          currency: ctx.org.baseCurrency,
          outstanding: must(outstanding, "Outstanding invoices"),
          overdue: (must(overdue, "Overdue invoices") as unknown[])[0] ?? null,
        },
      }
    },
  }),

  defineTool({
    name: "invoices_payment_stats",
    title: "Invoice payment stats",
    description: "How quickly invoices get paid in a date range: counts, on-time rate and average days to pay.",
    kind: "read",
    input: dateRange,
    run: async ({ from, to }, ctx) => ({
      data: must(await ctx.db.rpc("get_invoice_payment_stats", { p_from: from, p_to: to }), "Invoice payment stats"),
    }),
  }),

  defineTool({
    name: "invoices_next_number",
    title: "Next invoice number",
    description: "The invoice number the next new invoice will get. Doesn't reserve it.",
    kind: "read",
    input: {},
    run: async (_args, ctx) => ({ data: { next_invoice_number: must(await ctx.db.rpc("next_invoice_number"), "Next invoice number") } }),
  }),

  defineTool({
    name: "invoices_delete_draft",
    title: "Delete draft invoice",
    description: "Permanently delete an invoice that is still a draft. Sent invoices can't be deleted — they can only be canceled in the app.",
    kind: "destructive",
    confirm: true,
    input: { id: uuid("Invoice") },
    describe: async ({ id }, ctx) => {
      const inv = await loadInvoice(ctx, id, "id, invoice_number, status, customer_name, currency, total, token")
      if (inv.status !== "draft") throw new ToolError(`${invoiceLabel(inv)} is ${inv.status}, not a draft, so it can't be deleted.`)
      const amount = inv.total == null ? "" : ` for ${formatMoney(Number(inv.total), inv.currency, ctx.user.locale)}`
      return `Delete draft invoice ${invoiceLabel(inv)}${inv.customer_name ? ` to ${inv.customer_name}` : ""}${amount}? This can't be undone.`
    },
    run: async ({ id }, ctx) => {
      // Re-check at run time: it may have been sent since the question was
      // asked. The app may delete any invoice; the assistant only drafts.
      const inv = await ctx.invoices.get(id)
      const label = inv.invoiceNumber ?? `draft ${inv.id.slice(0, 8)}`
      if (inv.status !== "draft") throw new ToolError(`${label} is no longer a draft (${inv.status}); not deleted.`)
      await ctx.invoices.remove(id)
      return { data: { deleted: true, id }, entity: { type: "invoice", id }, summary: `Deleted draft invoice ${label}` }
    },
  }),
]

const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined", "expired"] as const
const QUOTE_LIST_COLUMNS = "id, quote_number, status, customer_id, customer_name, issue_date, valid_until, currency, total, sent_at, accepted_at, declined_at"
const QUOTE_DETAIL_COLUMNS =
  "id, quote_number, status, customer_id, customer_name, token, issue_date, valid_until, currency, line_items, subtotal, tax_amount, vat_rate, discount, discount_percent, total, note, sent_at, sent_via, accepted_at, declined_at, decline_reason, viewed_at, email_status, created_at, updated_at"

export const quoteTools = [
  defineTool({
    name: "quotes_list",
    title: "List quotes",
    description: "List quotes (estimates), newest first. Filter by status or customer, or search the quote number and customer name.",
    kind: "read",
    input: {
      status: z.array(z.enum(QUOTE_STATUSES)).optional(),
      customer_id: uuid("Customer").optional(),
      q: z.string().optional().describe("Search quote number or customer name"),
      ...pagination,
    },
    run: async (args, ctx) => {
      const paging = page(args)
      let query = ctx.db.select("quotes", QUOTE_LIST_COLUMNS)
      if (args.status?.length) query = query.in("status", args.status)
      if (args.customer_id) query = query.eq("customer_id", args.customer_id)
      if (args.q) query = query.or(`quote_number.ilike.${likeTerm(args.q)},customer_name.ilike.${likeTerm(args.q)}`)
      const rows = must(await query.order("created_at", { ascending: false }).range(paging.from, paging.to), "List quotes")
      return { data: listResult(rows, paging) }
    },
  }),

  defineTool({
    name: "quotes_get",
    title: "Get quote",
    description: "Full quote with line items, totals, status history and links.",
    kind: "read",
    input: { id: uuid("Quote") },
    run: async ({ id }, ctx) => {
      const { token, ...quote } = must(await ctx.db.select("quotes", QUOTE_DETAIL_COLUMNS).eq("id", id).maybeSingle(), "Quote") as Record<
        string,
        unknown
      >
      return {
        data: {
          ...quote,
          app_url: `${ctx.appUrl}/quotes/${id}`,
          public_url: token && quote.status !== "draft" ? `${ctx.appUrl}/q/${token}` : null,
        },
      }
    },
  }),

  defineTool({
    name: "quotes_pipeline",
    title: "Quote pipeline",
    description: "Quotes in a date range grouped by status with totals, plus the conversion funnel (sent → accepted → invoiced).",
    kind: "read",
    input: dateRange,
    run: async ({ from, to }, ctx) => {
      const [pipeline, funnel] = await Promise.all([
        ctx.db.rpc("get_quote_pipeline", { p_from: from, p_to: to }),
        ctx.db.rpc("get_quote_conversion_funnel", { p_from: from, p_to: to }),
      ])
      return { data: { pipeline: must(pipeline, "Quote pipeline"), funnel: must(funnel, "Quote funnel") } }
    },
  }),
]

const PAYMENT_METHODS = ["mpesa", "bank_transfer", "cash", "card", "cheque", "other"] as const
const PAYABLE_STATUSES = ["unpaid", "partially_paid", "overdue"]

export const paymentTools = [
  defineTool({
    name: "payments_list",
    title: "List payments on an invoice",
    description: "Every payment recorded against an invoice, newest first.",
    kind: "read",
    input: { invoice_id: uuid("Invoice") },
    run: async ({ invoice_id }, ctx) => ({
      data: must(
        await ctx.db
          .select("invoice_payments", "id, amount, currency, paid_at, method, reference, note, source, created_at")
          .eq("invoice_id", invoice_id)
          .order("paid_at", { ascending: false }),
        "Payments",
      ),
    }),
  }),

  defineTool({
    name: "payments_record",
    title: "Record a payment",
    description:
      "Record money received against a sent invoice (full or part payment). The invoice's status updates automatically. The amount is in the invoice's currency.",
    kind: "write",
    confirm: true,
    input: {
      invoice_id: uuid("Invoice"),
      amount: z.number().positive().describe("Amount received, in the invoice's currency"),
      paid_on: z.iso.date().optional().describe("Date received, YYYY-MM-DD (default today)"),
      method: z.enum(PAYMENT_METHODS).optional().describe("How it was paid (default mpesa)"),
      reference: z.string().max(100).optional().describe("M-Pesa code, bank reference, cheque number…"),
      note: z.string().max(500).optional(),
    },
    describe: async (args, ctx) => {
      const inv = await payableInvoice(ctx, args.invoice_id)
      const balance = Number(inv.total ?? 0) - Number(inv.amount_paid ?? 0)
      const over = args.amount > balance ? ` That's ${formatMoney(args.amount - balance, inv.currency, ctx.user.locale)} more than the balance due.` : ""
      return `Record ${formatMoney(args.amount, inv.currency, ctx.user.locale)} paid on ${invoiceLabel(inv)}${inv.customer_name ? ` (${inv.customer_name})` : ""}?${over}`
    },
    run: async (args, ctx) => {
      // Same service the app's "Record payment" uses: status derived by the
      // database, "invoice paid" notification when it settles the invoice.
      const paidOn = args.paid_on ?? new Date().toISOString().slice(0, 10)
      const result = await ctx.invoices.recordPayment({
        invoice_id: args.invoice_id,
        amount: args.amount,
        // Noon UTC so the stored timestamp never drifts onto another calendar day.
        paid_at: `${paidOn}T12:00:00Z`,
        method: args.method ?? "mpesa",
        reference: args.reference ?? null,
        note: args.note ?? null,
      })
      const label = result.invoice.invoiceNumber ?? "the invoice"
      return {
        data: {
          payment_id: result.payment.id,
          invoice_status: result.invoice.status,
          balance_due: Number(result.invoice.total ?? 0) - Number(result.invoice.amountPaid),
        },
        entity: { type: "invoice", id: args.invoice_id },
        summary: `Recorded ${formatMoney(args.amount, result.invoice.currency)} on ${label}`,
      }
    },
  }),
]

async function payableInvoice(ctx: McpContext, id: string) {
  const inv = await loadInvoice(ctx, id, "id, invoice_number, status, currency, total, amount_paid, customer_name, token")
  if (!PAYABLE_STATUSES.includes(inv.status)) {
    throw new ToolError(`${invoiceLabel(inv)} is ${inv.status}; payments can only be recorded on sent, unpaid invoices.`)
  }
  return inv
}
