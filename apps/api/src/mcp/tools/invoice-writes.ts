import { z } from "zod"
import { discountSchema, lineItemSchema, saveInvoiceSchema } from "../../services/invoice-schemas.js"
import type { McpContext } from "../types.js"
import { defineTool, ToolError } from "../types.js"
import { formatMoney, must, uuid } from "../util.js"
import { invoiceLabel, loadInvoice } from "./invoices.js"

// Invoice writes for the assistant (plan §5), on the same services the app's
// /v1 routes use — the assistant can't create or send an invoice any
// differently from the app. Invoices are always created as drafts; sending
// is a separate, confirmed step (plan §7.5).

const documentFields = {
  line_items: z
    .array(lineItemSchema)
    .min(1)
    .max(200)
    .describe("Lines: description, quantity, unit price (in the invoice currency), optional tax_rate %"),
  currency: z.string().length(3).optional().describe("ISO 4217 code; defaults to the organisation's base currency"),
  issue_date: z.iso.date().optional().describe("YYYY-MM-DD; defaults to none (set when sending)"),
  due_date: z.iso.date().optional().describe("YYYY-MM-DD"),
  invoice_number: z.string().max(50).optional().describe("Leave out to take the next number in sequence"),
  discount: discountSchema.optional().describe('Whole-invoice discount: { type: "%" | "fixed", value }'),
  vat_rate: z.number().min(0).max(100).optional().describe("Invoice-level VAT %, applied after the discount"),
  note: z.string().max(5000).optional().describe("Note shown on the invoice"),
  payment_details: z.string().max(5000).optional().describe("How to pay (bank, M-Pesa till…)"),
}

async function customerContact(ctx: McpContext, customerId: string | null) {
  if (!customerId) return null
  const row = must(
    await ctx.db.select("customers", "name, email, billing_email").eq("id", customerId).maybeSingle(),
    "Customer",
  ) as { name: string; email: string | null; billing_email: string | null }
  return { name: row.name, email: row.billing_email || row.email }
}

const SUMMARY_COLUMNS = "id, invoice_number, status, customer_id, customer_name, currency, total, amount_paid, token"

export const invoiceWriteTools = [
  defineTool({
    name: "invoices_create_draft",
    title: "Create draft invoice",
    description:
      "Create an invoice as a draft for an existing customer (find them with customers_list or search). Totals are calculated for you. It isn't sent — use invoices_send after the user has reviewed it.",
    kind: "write",
    input: { customer_id: uuid("Customer"), ...documentFields },
    run: async (args, ctx) => {
      const { invoice } = await ctx.invoices.create(
        saveInvoiceSchema.parse({ ...args, currency: args.currency ?? ctx.org.baseCurrency, action: "draft" }),
      )
      const label = invoice.invoiceNumber ?? "draft"
      return {
        data: {
          id: invoice.id,
          invoice_number: invoice.invoiceNumber,
          status: invoice.status,
          total: Number(invoice.total),
          currency: invoice.currency,
          app_url: `${ctx.appUrl}/invoices/${invoice.id}`,
        },
        entity: { type: "invoice", id: invoice.id },
        summary: `Created draft invoice ${label} for ${invoice.customerName ?? "a customer"} (${formatMoney(Number(invoice.total), invoice.currency)})`,
      }
    },
  }),

  defineTool({
    name: "invoices_update_draft",
    title: "Update draft invoice",
    description: "Change a draft invoice. Only the fields you pass change; passing line_items replaces all lines. Sent invoices can't be edited.",
    kind: "write",
    input: { id: uuid("Invoice"), customer_id: uuid("Customer").optional(), ...z.object(documentFields).partial().shape },
    run: async ({ id, ...changes }, ctx) => {
      const row = await ctx.invoices.get(id)
      if (row.status !== "draft") throw new ToolError(`This invoice is ${row.status}; only drafts can be edited.`)
      // Start from what's saved, so unspecified fields keep their values.
      const current = {
        customer_id: row.customerId,
        invoice_number: row.invoiceNumber ?? undefined,
        currency: row.currency,
        issue_date: row.issueDate,
        due_date: row.dueDate,
        line_items: row.lineItems,
        discount:
          row.discountPercent != null
            ? { type: "%" as const, value: Number(row.discountPercent) }
            : Number(row.discount ?? 0) > 0
              ? { type: "fixed" as const, value: Number(row.discount) }
              : null,
        vat_rate: row.vatRate == null ? null : Number(row.vatRate),
        payment_details: row.paymentDetails ?? "",
        note: row.note ?? "",
        custom_fields: row.customFields,
        settings: {
          accept_payments: row.acceptPayments ?? false,
          partial_payments: row.partialPayments,
          include_pdf: row.includePdf ?? true,
          invoice_template: row.invoiceTemplate ?? "classic",
          date_format: row.dateFormat,
          show_tax_column: row.showTaxColumn,
          show_qty_column: row.showQtyColumn,
        },
        recurring: { frequency: row.recurring },
      }
      const defined = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined))
      const { invoice } = await ctx.invoices.update(id, saveInvoiceSchema.parse({ ...current, ...defined, action: "draft" }))
      return {
        data: { id, invoice_number: invoice.invoiceNumber, total: Number(invoice.total), currency: invoice.currency },
        entity: { type: "invoice", id },
        summary: `Updated ${Object.keys(defined).join(", ")} on draft ${invoice.invoiceNumber ?? id.slice(0, 8)}`,
      }
    },
  }),

  defineTool({
    name: "invoices_send",
    title: "Send invoice by email",
    description: "Issue a draft invoice and email it to the customer. Always show the user the invoice first.",
    kind: "write",
    confirm: true,
    input: { id: uuid("Invoice") },
    describe: async ({ id }, ctx) => {
      const inv = await loadInvoice(ctx, id, SUMMARY_COLUMNS)
      if (inv.status !== "draft") throw new ToolError(`${invoiceLabel(inv)} was already ${inv.status}.`)
      const contact = await customerContact(ctx, inv.customer_id as string | null)
      if (!contact?.email) throw new ToolError(`${contact?.name ?? "This customer"} has no email address; add one first.`)
      return `Send invoice ${invoiceLabel(inv)} for ${formatMoney(Number(inv.total ?? 0), inv.currency, ctx.user.locale)} to ${contact.name} at ${contact.email}?`
    },
    run: async ({ id }, ctx) => {
      const { invoice, email } = await ctx.invoices.issue(id, "email")
      return {
        data: {
          status: invoice.status,
          email: email?.ok ? (email.queued ? "sending with PDF" : "sent") : `failed: ${email && !email.ok ? email.error : "unknown"}`,
          public_url: invoice.token ? `${ctx.appUrl}/i/${invoice.token}` : null,
        },
        entity: { type: "invoice", id },
        summary: `Sent invoice ${invoice.invoiceNumber ?? id.slice(0, 8)} by email`,
      }
    },
  }),

  defineTool({
    name: "invoices_mark_sent",
    title: "Mark invoice as sent",
    description:
      "Issue a draft without emailing it, when the user sent it themselves (WhatsApp, printed, in person). It becomes unpaid and its public link starts working.",
    kind: "write",
    input: { id: uuid("Invoice"), via: z.enum(["whatsapp", "link", "pdf", "manual"]).optional().describe("How it was sent (default manual)") },
    run: async ({ id, via }, ctx) => {
      const { invoice } = await ctx.invoices.issue(id, via ?? "manual")
      return {
        data: { status: invoice.status, public_url: invoice.token ? `${ctx.appUrl}/i/${invoice.token}` : null },
        entity: { type: "invoice", id },
        summary: `Marked invoice ${invoice.invoiceNumber ?? id.slice(0, 8)} as sent`,
      }
    },
  }),

  defineTool({
    name: "invoices_send_reminder",
    title: "Send payment reminder",
    description: "Email the customer a reminder about an unpaid or overdue invoice.",
    kind: "write",
    confirm: true,
    input: { id: uuid("Invoice") },
    describe: async ({ id }, ctx) => {
      const inv = await loadInvoice(ctx, id, SUMMARY_COLUMNS)
      if (!["unpaid", "overdue", "partially_paid"].includes(inv.status)) {
        throw new ToolError(`${invoiceLabel(inv)} is ${inv.status}; reminders are for unpaid invoices.`)
      }
      const contact = await customerContact(ctx, inv.customer_id as string | null)
      const balance = Number(inv.total ?? 0) - Number((inv as Record<string, unknown>).amount_paid ?? 0)
      return `Send a reminder for ${invoiceLabel(inv)} (${formatMoney(balance, inv.currency, ctx.user.locale)} due) to ${contact?.name ?? inv.customer_name}${contact?.email ? ` at ${contact.email}` : ""}?`
    },
    run: async ({ id }, ctx) => {
      const { invoice } = await ctx.invoices.remind(id)
      return { data: { reminded: true }, entity: { type: "invoice", id }, summary: `Sent a reminder for ${invoice.invoiceNumber ?? id.slice(0, 8)}` }
    },
  }),

  defineTool({
    name: "invoices_mark_paid",
    title: "Mark invoice paid",
    description: "Record a payment for the whole remaining balance (method: other). For part payments or a specific method, use payments_record.",
    kind: "write",
    confirm: true,
    input: { id: uuid("Invoice") },
    describe: async ({ id }, ctx) => {
      const inv = await loadInvoice(ctx, id, SUMMARY_COLUMNS)
      const balance = Number(inv.total ?? 0) - Number((inv as Record<string, unknown>).amount_paid ?? 0)
      if (balance <= 0) throw new ToolError(`Nothing is owed on ${invoiceLabel(inv)}.`)
      return `Mark ${invoiceLabel(inv)} as paid (${formatMoney(balance, inv.currency, ctx.user.locale)} received)?`
    },
    run: async ({ id }, ctx) => {
      const { invoice } = await ctx.invoices.markPaid(id)
      return { data: { status: invoice.status }, entity: { type: "invoice", id }, summary: `Marked ${invoice.invoiceNumber ?? id.slice(0, 8)} as paid` }
    },
  }),

  defineTool({
    name: "invoices_cancel",
    title: "Cancel invoice",
    description: "Cancel a sent, unpaid invoice that has no payments recorded. The customer's link shows it as canceled; no email is sent.",
    kind: "write",
    confirm: true,
    input: { id: uuid("Invoice") },
    describe: async ({ id }, ctx) => {
      const inv = await loadInvoice(ctx, id, SUMMARY_COLUMNS)
      return `Cancel invoice ${invoiceLabel(inv)}${inv.customer_name ? ` to ${inv.customer_name}` : ""}? The customer's link will show it as canceled.`
    },
    run: async ({ id }, ctx) => {
      const { invoice } = await ctx.invoices.cancel(id)
      return { data: { status: invoice.status }, entity: { type: "invoice", id }, summary: `Canceled invoice ${invoice.invoiceNumber ?? id.slice(0, 8)}` }
    },
  }),

  defineTool({
    name: "invoices_duplicate",
    title: "Duplicate invoice",
    description: "Copy an invoice into a new draft with the next number (no dates). Handy for repeat work.",
    kind: "write",
    input: { id: uuid("Invoice") },
    run: async ({ id }, ctx) => {
      const { invoice } = await ctx.invoices.duplicate(id)
      return {
        data: { id: invoice.id, invoice_number: invoice.invoiceNumber, app_url: `${ctx.appUrl}/invoices/${invoice.id}` },
        entity: { type: "invoice", id: invoice.id },
        summary: `Duplicated into draft ${invoice.invoiceNumber}`,
      }
    },
  }),
]
