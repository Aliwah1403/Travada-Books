import { z } from "zod"
import { discountSchema, lineItemSchema } from "../../services/invoice-schemas.js"
import { saveQuoteSchema } from "../../services/quote-schemas.js"
import type { McpContext } from "../types.js"
import { defineTool, ToolError } from "../types.js"
import { dateContext, formatMoney, must, uuid } from "../util.js"

// Quote writes for the assistant (ASSISTANT-PLAN §5), on the same services
// the app's /v1/quotes routes use. Quotes are always created as drafts;
// emailing one is a separate, confirmed step (§7.5).

const documentFields = {
  line_items: z
    .array(lineItemSchema)
    .min(1)
    .max(200)
    .describe("Lines: description, quantity, unit price (in the quote currency), optional tax_rate %"),
  currency: z.string().length(3).optional().describe("ISO 4217 code; defaults to the organisation's base currency"),
  issue_date: z.iso.date().optional().describe("YYYY-MM-DD; defaults to today"),
  valid_until: z.iso
    .date()
    .nullable()
    .optional()
    .describe("YYYY-MM-DD expiry; leave out to use the organisation's usual validity period, null for no expiry"),
  quote_number: z.string().max(50).optional().describe("Leave out to take the next number in sequence"),
  discount: discountSchema.optional().describe('Whole-quote discount: { type: "%" | "fixed", value }'),
  vat_rate: z.number().min(0).max(100).optional().describe("Quote-level VAT %, applied after the discount"),
  note: z.string().max(5000).optional().describe("Note shown on the quote"),
}

const SUMMARY_COLUMNS = "id, quote_number, status, customer_id, customer_name, currency, total, valid_until"

type QuoteSummary = {
  id: string
  quote_number: string | null
  status: string
  customer_id: string
  customer_name: string | null
  currency: string
  total: number | null
  valid_until: string | null
}

async function loadQuote(ctx: McpContext, id: string) {
  return must(await ctx.db.select("quotes", SUMMARY_COLUMNS).eq("id", id).maybeSingle(), "Quote") as unknown as QuoteSummary
}

const quoteLabel = (q: { quote_number: string | null; id: string }) => q.quote_number ?? `draft ${q.id.slice(0, 8)}`
const amountOf = (q: QuoteSummary, ctx: McpContext) => formatMoney(Number(q.total ?? 0), q.currency, ctx.user.locale)

async function customerContact(ctx: McpContext, customerId: string) {
  const row = must(
    await ctx.db.select("customers", "name, email, billing_email").eq("id", customerId).maybeSingle(),
    "Customer",
  ) as { name: string; email: string | null; billing_email: string | null }
  return { name: row.name, email: row.billing_email || row.email }
}

export const quoteWriteTools = [
  defineTool({
    name: "quotes_create_draft",
    title: "Create draft quote",
    description:
      "Create a quote (estimate) as a draft for an existing customer (find them with customers_list or search). Totals are calculated for you. It isn't sent — use quotes_send after the user has reviewed it.",
    kind: "write",
    input: { customer_id: uuid("Customer"), ...documentFields },
    run: async (args, ctx) => {
      const { quote } = await ctx.quotes.create(
        saveQuoteSchema.parse({
          ...args,
          currency: args.currency ?? ctx.org.baseCurrency,
          issue_date: args.issue_date ?? dateContext(ctx.user.timezone).today,
          action: "draft",
        }),
      )
      return {
        data: {
          id: quote.id,
          quote_number: quote.quoteNumber,
          status: quote.status,
          total: Number(quote.total),
          currency: quote.currency,
          valid_until: quote.validUntil,
          app_url: `${ctx.appUrl}/quotes/${quote.id}`,
        },
        entity: { type: "quote", id: quote.id },
        summary: `Created draft quote ${quote.quoteNumber ?? "draft"} for ${quote.customerName ?? "a customer"} (${formatMoney(Number(quote.total), quote.currency ?? ctx.org.baseCurrency)})`,
      }
    },
  }),

  defineTool({
    name: "quotes_update_draft",
    title: "Update draft quote",
    description:
      "Change a draft or declined quote (a declined quote goes back to draft so it can be resent). Only the fields you pass change; passing line_items replaces all lines. Sent and accepted quotes can't be edited.",
    kind: "write",
    input: { id: uuid("Quote"), customer_id: uuid("Customer").optional(), ...z.object(documentFields).partial().shape },
    run: async ({ id, ...changes }, ctx) => {
      const row = await ctx.quotes.get(id)
      if (row.status !== "draft" && row.status !== "declined") {
        throw new ToolError(`This quote is ${row.status}; only drafts and declined quotes can be edited.`)
      }
      // Start from what's saved, so unspecified fields keep their values.
      const current = {
        customer_id: row.customerId,
        quote_number: row.quoteNumber ?? undefined,
        currency: row.currency ?? ctx.org.baseCurrency,
        issue_date: row.issueDate,
        valid_until: row.validUntil,
        line_items: row.lineItems,
        discount:
          row.discountPercent != null
            ? { type: "%" as const, value: Number(row.discountPercent) }
            : Number(row.discount ?? 0) > 0
              ? { type: "fixed" as const, value: Number(row.discount) }
              : null,
        vat_rate: row.vatRate == null ? null : Number(row.vatRate),
        note: row.note ?? "",
        custom_fields: row.customFields,
        settings: { include_pdf: row.includePdf, quote_template: row.quoteTemplate },
      }
      const defined = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined))
      const { quote } = await ctx.quotes.update(id, saveQuoteSchema.parse({ ...current, ...defined, action: "draft" }))
      return {
        data: { id, quote_number: quote.quoteNumber, status: quote.status, total: Number(quote.total), currency: quote.currency },
        entity: { type: "quote", id },
        summary: `Updated ${Object.keys(defined).join(", ") || "nothing"} on quote ${quote.quoteNumber ?? id.slice(0, 8)}`,
      }
    },
  }),

  defineTool({
    name: "quotes_send",
    title: "Send quote by email",
    description: "Issue a draft (or declined) quote and email it to the customer. Always show the user the quote first.",
    kind: "write",
    confirm: true,
    input: { id: uuid("Quote") },
    describe: async ({ id }, ctx) => {
      const q = await loadQuote(ctx, id)
      if (q.status !== "draft" && q.status !== "declined") throw new ToolError(`${quoteLabel(q)} was already ${q.status}.`)
      const contact = await customerContact(ctx, q.customer_id)
      if (!contact.email) throw new ToolError(`${contact.name} has no email address; add one first.`)
      const expiry = q.valid_until ? `, valid until ${q.valid_until}` : ""
      return `Send quote ${quoteLabel(q)} for ${amountOf(q, ctx)}${expiry} to ${contact.name} at ${contact.email}?`
    },
    run: async ({ id }, ctx) => {
      const { quote, email } = await ctx.quotes.issue(id, "email")
      return {
        data: {
          status: quote.status,
          email: email?.ok ? (email.queued ? "sending with PDF" : "sent") : `failed: ${email && !email.ok ? email.error : "unknown"}`,
          public_url: `${ctx.appUrl}/q/${quote.token}`,
        },
        entity: { type: "quote", id },
        summary: `Sent quote ${quote.quoteNumber ?? id.slice(0, 8)} by email`,
      }
    },
  }),

  defineTool({
    name: "quotes_mark_sent",
    title: "Mark quote as sent",
    description:
      "Issue a draft quote without emailing it, when the user sent it themselves (WhatsApp, printed, in person). Its public link starts working, so the customer can accept it online.",
    kind: "write",
    input: { id: uuid("Quote"), via: z.enum(["whatsapp", "link", "pdf", "manual"]).optional().describe("How it was sent (default manual)") },
    run: async ({ id, via }, ctx) => {
      const { quote } = await ctx.quotes.issue(id, via ?? "manual")
      return {
        data: { status: quote.status, public_url: `${ctx.appUrl}/q/${quote.token}` },
        entity: { type: "quote", id },
        summary: `Marked quote ${quote.quoteNumber ?? id.slice(0, 8)} as sent`,
      }
    },
  }),

  defineTool({
    name: "quotes_mark_accepted",
    title: "Mark quote accepted",
    description:
      "Record that the customer accepted a sent quote outside the quote link (phone, WhatsApp, in person). Creates the draft invoice for it, as the customer's own Accept does. Expired quotes can't be accepted.",
    kind: "write",
    confirm: true,
    input: { id: uuid("Quote") },
    describe: async ({ id }, ctx) => {
      const q = await loadQuote(ctx, id)
      if (q.status !== "sent") throw new ToolError(`${quoteLabel(q)} is ${q.status}; only sent quotes can be accepted.`)
      return `Mark quote ${quoteLabel(q)} (${amountOf(q, ctx)}) as accepted by ${q.customer_name ?? "the customer"} and create its draft invoice?`
    },
    run: async ({ id }, ctx) => {
      const { quote, invoice } = await ctx.quotes.accept(id)
      return {
        data: {
          status: quote.status,
          invoice: { id: invoice.id, invoice_number: invoice.invoiceNumber, status: invoice.status, app_url: `${ctx.appUrl}/invoices/${invoice.id}` },
        },
        entity: { type: "quote", id },
        summary: `Marked quote ${quote.quoteNumber ?? id.slice(0, 8)} accepted; created draft invoice ${invoice.invoiceNumber}`,
      }
    },
  }),

  defineTool({
    name: "quotes_mark_declined",
    title: "Mark quote declined",
    description: "Record that the customer turned down a sent quote. It can be edited and resent later.",
    kind: "write",
    input: { id: uuid("Quote"), reason: z.string().max(1000).optional().describe("Why, if the customer said") },
    run: async ({ id, reason }, ctx) => {
      const { quote } = await ctx.quotes.decline(id, reason ?? null)
      return {
        data: { status: quote.status },
        entity: { type: "quote", id },
        summary: `Marked quote ${quote.quoteNumber ?? id.slice(0, 8)} declined${reason ? ` (${reason})` : ""}`,
      }
    },
  }),

  defineTool({
    name: "quotes_convert_to_invoice",
    title: "Convert quote to invoice",
    description:
      "Get the draft invoice for an accepted quote, creating it if it doesn't exist yet. Safe to repeat — it never makes a second invoice. For a quote the customer hasn't accepted yet, use quotes_mark_accepted.",
    kind: "write",
    input: { id: uuid("Quote") },
    run: async ({ id }, ctx) => {
      const { quote, invoice, created } = await ctx.quotes.convert(id)
      return {
        data: {
          created,
          invoice: { id: invoice.id, invoice_number: invoice.invoiceNumber, status: invoice.status, app_url: `${ctx.appUrl}/invoices/${invoice.id}` },
        },
        entity: { type: "invoice", id: invoice.id },
        summary: created
          ? `Created draft invoice ${invoice.invoiceNumber} from quote ${quote.quoteNumber ?? id.slice(0, 8)}`
          : `Quote ${quote.quoteNumber ?? id.slice(0, 8)} already has invoice ${invoice.invoiceNumber}`,
      }
    },
  }),

  defineTool({
    name: "quotes_duplicate",
    title: "Duplicate quote",
    description: "Copy a quote into a new draft with the next number. Handy for a similar job for another customer (then update its customer_id).",
    kind: "write",
    input: { id: uuid("Quote") },
    run: async ({ id }, ctx) => {
      const { quote } = await ctx.quotes.duplicate(id)
      return {
        data: { id: quote.id, quote_number: quote.quoteNumber, app_url: `${ctx.appUrl}/quotes/${quote.id}` },
        entity: { type: "quote", id: quote.id },
        summary: `Duplicated into draft quote ${quote.quoteNumber}`,
      }
    },
  }),

  defineTool({
    name: "quotes_delete_draft",
    title: "Delete draft quote",
    description: "Permanently delete a quote that is still a draft. Sent quotes can only be deleted in the app.",
    kind: "destructive",
    confirm: true,
    input: { id: uuid("Quote") },
    describe: async ({ id }, ctx) => {
      const q = await loadQuote(ctx, id)
      if (q.status !== "draft") throw new ToolError(`${quoteLabel(q)} is ${q.status}, not a draft, so it can't be deleted.`)
      return `Delete draft quote ${quoteLabel(q)}${q.customer_name ? ` to ${q.customer_name}` : ""} for ${amountOf(q, ctx)}? This can't be undone.`
    },
    run: async ({ id }, ctx) => {
      // Re-check at run time: it may have been sent since the question was asked.
      const q = await ctx.quotes.get(id)
      const label = q.quoteNumber ?? `draft ${q.id.slice(0, 8)}`
      if (q.status !== "draft") throw new ToolError(`${label} is no longer a draft (${q.status}); not deleted.`)
      await ctx.quotes.remove(id)
      return { data: { deleted: true, id }, entity: { type: "quote", id }, summary: `Deleted draft quote ${label}` }
    },
  }),
]
