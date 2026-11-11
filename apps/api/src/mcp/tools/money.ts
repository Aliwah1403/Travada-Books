import { z } from "zod"
import { defineTool, ToolError } from "../types.js"
import { likeTerm, listResult, must, page, pagination, uuid } from "../util.js"

// Transactions, categories and bills: money in and out that isn't an invoice.

const TX_COLUMNS =
  "id, date, name, counterparty_name, amount, currency, base_amount, base_currency, type, status, payment_mode, category_id, invoice_id, customer_id, tax_amount, tax_type, recurring, frequency, internal, reference_number, note, has_attachments, transaction_categories(name)"

export const transactionTools = [
  defineTool({
    name: "transactions_list",
    title: "List transactions",
    description:
      "Money in (income) and out (expense), newest first. Filter by type, status, category, date range, or search the description and counterparty. Amounts are positive; `type` says the direction.",
    kind: "read",
    input: {
      type: z.enum(["income", "expense"]).optional(),
      status: z.array(z.enum(["pending", "completed", "excluded", "archived"])).optional().describe("Default: pending and completed"),
      category_id: uuid("Category").optional(),
      uncategorized: z.boolean().optional().describe("Only transactions with no category"),
      q: z.string().optional().describe("Search description or counterparty"),
      from: z.iso.date().optional().describe("On or after, YYYY-MM-DD"),
      to: z.iso.date().optional().describe("On or before, YYYY-MM-DD"),
      ...pagination,
    },
    run: async (args, ctx) => {
      const paging = page(args)
      let query = ctx.db.select("transactions", TX_COLUMNS).in("status", args.status ?? ["pending", "completed"])
      if (args.type) query = query.eq("type", args.type)
      if (args.category_id) query = query.eq("category_id", args.category_id)
      if (args.uncategorized) query = query.is("category_id", null)
      if (args.q) query = query.or(`name.ilike.${likeTerm(args.q)},counterparty_name.ilike.${likeTerm(args.q)}`)
      if (args.from) query = query.gte("date", args.from)
      if (args.to) query = query.lte("date", args.to)
      const rows = must(
        await query.order("date", { ascending: false }).order("created_at", { ascending: false }).range(paging.from, paging.to),
        "List transactions",
      )
      return { data: listResult(rows, paging) }
    },
  }),

  defineTool({
    name: "transactions_get",
    title: "Get transaction",
    description: "One transaction with its category and linked invoice.",
    kind: "read",
    input: { id: uuid("Transaction") },
    run: async ({ id }, ctx) => ({
      data: must(await ctx.db.select("transactions", `${TX_COLUMNS}, created_at`).eq("id", id).maybeSingle(), "Transaction"),
    }),
  }),

  defineTool({
    name: "categories_list",
    title: "List categories",
    description: "The organisation's transaction categories, for filtering and categorising.",
    kind: "read",
    input: {},
    run: async (_args, ctx) => ({
      data: must(await ctx.db.select("transaction_categories", "id, name, slug, color, system").order("name"), "Categories"),
    }),
  }),

  defineTool({
    name: "transactions_categorize",
    title: "Categorise transactions",
    description: "Set the category on one or more transactions (up to 50). Use categories_list to find the category ID.",
    kind: "write",
    input: {
      transaction_ids: z.array(z.uuid()).min(1).max(50),
      category_id: uuid("Category"),
    },
    run: async ({ transaction_ids, category_id }, ctx) => {
      // The category must belong to this org too, not just the transactions.
      const category = must(
        await ctx.db.select("transaction_categories", "id, name").eq("id", category_id).maybeSingle(),
        "Category",
      ) as { id: string; name: string }
      const rows = must(
        await ctx.db.update("transactions", { category_id }).in("id", transaction_ids).select("id"),
        "Categorise",
      ) as { id: string }[]
      if (rows.length === 0) throw new ToolError("None of those transactions were found")
      return {
        data: { updated: rows.length, category: category.name },
        entity: rows.length === 1 && rows[0] ? { type: "transaction", id: rows[0].id } : undefined,
        summary: `Categorised ${rows.length} transaction${rows.length === 1 ? "" : "s"} as ${category.name}`,
      }
    },
  }),
]

const BILL_COLUMNS = "id, vendor_name, bill_number, amount, currency, issue_date, due_date, status, paid_at, transaction_id, inbox_item_id, source, note, created_at"

export const billTools = [
  defineTool({
    name: "bills_list",
    title: "List bills",
    description: "Bills the business has to pay (from suppliers), soonest due first. Filter by status or vendor.",
    kind: "read",
    input: {
      status: z.enum(["unpaid", "paid"]).optional(),
      q: z.string().optional().describe("Search vendor name or bill number"),
      ...pagination,
    },
    run: async (args, ctx) => {
      const paging = page(args)
      let query = ctx.db.select("bills", BILL_COLUMNS)
      if (args.status) query = query.eq("status", args.status)
      if (args.q) query = query.or(`vendor_name.ilike.${likeTerm(args.q)},bill_number.ilike.${likeTerm(args.q)}`)
      const rows = must(
        await query.order("due_date", { ascending: true, nullsFirst: false }).range(paging.from, paging.to),
        "List bills",
      )
      return { data: listResult(rows, paging) }
    },
  }),

  defineTool({
    name: "bills_mark_paid",
    title: "Mark bill paid",
    description: "Mark a bill as paid (today), or as unpaid again.",
    kind: "write",
    input: { id: uuid("Bill"), paid: z.boolean().optional().describe("Default true; false marks it unpaid again") },
    run: async ({ id, paid = true }, ctx) => {
      const today = new Date().toISOString().slice(0, 10)
      const rows = must(
        await ctx.db
          .update("bills", { status: paid ? "paid" : "unpaid", paid_at: paid ? today : null, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select("id, vendor_name, bill_number"),
        "Update bill",
      ) as { id: string; vendor_name: string | null; bill_number: string | null }[]
      const bill = rows[0]
      if (!bill) throw new ToolError("Bill not found")
      const label = [bill.vendor_name, bill.bill_number].filter(Boolean).join(" ") || "bill"
      return { data: bill, entity: { type: "bill", id }, summary: `Marked ${label} ${paid ? "paid" : "unpaid"}` }
    },
  }),
]

export const inboxTools = [
  defineTool({
    name: "inbox_list",
    title: "List inbox",
    description:
      "Receipts and documents that arrived by email or upload, with what was extracted (vendor, amount, date) and whether they're matched to a transaction.",
    kind: "read",
    input: {
      status: z
        .array(z.enum(["new", "processing", "analyzing", "suggested_match", "no_match", "pending", "done", "archived"]))
        .optional()
        .describe("Default: everything except archived and deleted"),
      ...pagination,
    },
    run: async (args, ctx) => {
      const paging = page(args)
      let query = ctx.db.select(
        "inbox_items",
        "id, created_at, display_name, file_name, sender_email, date, amount, currency, tax_amount, invoice_number, type, status, transaction_id",
      )
      query = args.status?.length ? query.in("status", args.status) : query.not("status", "in", "(archived,deleted)")
      const rows = must(await query.order("created_at", { ascending: false }).range(paging.from, paging.to), "List inbox")
      return { data: listResult(rows, paging) }
    },
  }),

  defineTool({
    name: "inbox_get",
    title: "Get inbox item",
    description: "One inbox document with its extracted fields and suggested transaction matches.",
    kind: "read",
    input: { id: uuid("Inbox item") },
    run: async ({ id }, ctx) => {
      const item = must(
        await ctx.db
          .select(
            "inbox_items",
            "id, created_at, display_name, file_name, content_type, sender_email, website, date, amount, currency, base_amount, base_currency, tax_amount, tax_rate, tax_type, invoice_number, type, status, transaction_id",
          )
          .eq("id", id)
          .maybeSingle(),
        "Inbox item",
      ) as Record<string, unknown>
      const suggestions = must(
        await ctx.db
          .select(
            "transaction_match_suggestions",
            "id, transaction_id, confidence_score, match_type, status, transactions(id, name, amount, currency, date, counterparty_name)",
          )
          .eq("inbox_item_id", id)
          .eq("status", "pending")
          // Best candidate first, as the app shows it.
          .order("confidence_score", { ascending: false }),
        "Match suggestions",
      )
      return { data: { ...item, suggestions } }
    },
  }),
]
