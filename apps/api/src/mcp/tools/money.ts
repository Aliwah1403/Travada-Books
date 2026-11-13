import { z } from "zod"
import { createBillSchema, updateBillSchema } from "../../services/bill-schemas.js"
import {
  createTransactionSchema,
  PAYMENT_MODES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  updateTransactionSchema,
} from "../../services/transaction-schemas.js"
import { defineTool, ToolError } from "../types.js"
import { dateContext, formatMoney, likeTerm, listResult, must, page, pagination, uuid } from "../util.js"

// Transactions, categories and bills: money in and out that isn't an invoice.

const TX_COLUMNS =
  "id, date, name, counterparty_name, amount, currency, base_amount, base_currency, type, status, payment_mode, category_id, invoice_id, customer_id, tax_amount, tax_type, recurring, frequency, internal, reference_number, note, has_attachments, transaction_categories(name)"

// Fields the assistant may set on a transaction (a subset of the app's sheet).
const txFields = {
  name: z.string().min(1).max(300).describe("What it was, e.g. 'Office rent' or 'KPLC tokens'"),
  amount: z.number().positive().describe("Always positive; type says whether money came in or went out"),
  type: z.enum(TRANSACTION_TYPES),
  counterparty_name: z.string().max(300).optional().describe("Who paid or was paid"),
  category_id: uuid("Category").optional(),
  customer_id: uuid("Customer").optional(),
  payment_mode: z.enum(PAYMENT_MODES).optional(),
  reference_number: z.string().max(200).optional().describe("M-Pesa code, cheque number…"),
  note: z.string().max(5000).optional(),
}

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
      const category = must(
        await ctx.db.select("transaction_categories", "id, name").eq("id", category_id).maybeSingle(),
        "Category",
      ) as { id: string; name: string }
      const { updated, ids } = await ctx.transactions.bulkUpdate(transaction_ids, { category_id })
      return {
        data: { updated, category: category.name },
        entity: ids.length === 1 && ids[0] ? { type: "transaction", id: ids[0] } : undefined,
        summary: `Categorised ${updated} transaction${updated === 1 ? "" : "s"} as ${category.name}`,
      }
    },
  }),

  defineTool({
    name: "transactions_create",
    title: "Record transaction",
    description:
      "Record money in or out that isn't from a bank feed (cash, M-Pesa, a card payment). To record a customer paying an invoice, use payments_record instead.",
    kind: "write",
    input: {
      ...txFields,
      date: z.iso.date().optional().describe("YYYY-MM-DD; defaults to today"),
      currency: z.string().length(3).optional().describe("ISO 4217 code; defaults to the organisation's base currency"),
    },
    run: async (args, ctx) => {
      const { transaction } = await ctx.transactions.create(
        createTransactionSchema.parse({
          ...args,
          date: args.date ?? dateContext(ctx.user.timezone).today,
          currency: args.currency ?? ctx.org.baseCurrency,
        }),
      )
      return {
        data: { id: transaction.id, app_url: `${ctx.appUrl}/transactions?id=${transaction.id}` },
        entity: { type: "transaction", id: transaction.id },
        summary: `Recorded ${transaction.type} "${transaction.name}" (${formatMoney(Number(transaction.amount), transaction.currency)})`,
      }
    },
  }),

  defineTool({
    name: "transactions_update",
    title: "Update transaction",
    description: "Change a transaction's details. Only the fields you pass change. Changing amount or currency recalculates the base-currency amount.",
    kind: "write",
    input: {
      id: uuid("Transaction"),
      ...z.object(txFields).partial().shape,
      date: z.iso.date().optional(),
      currency: z.string().length(3).optional(),
      status: z.enum(TRANSACTION_STATUSES).optional().describe("excluded = left out of reports; archived = hidden"),
    },
    run: async ({ id, ...changes }, ctx) => {
      const defined = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined))
      if (Object.keys(defined).length === 0) throw new ToolError("Nothing to update")
      const { transaction } = await ctx.transactions.update(id, updateTransactionSchema.parse(defined))
      return {
        data: { id, name: transaction.name, amount: Number(transaction.amount), currency: transaction.currency, status: transaction.status },
        entity: { type: "transaction", id },
        summary: `Updated ${Object.keys(defined).join(", ")} on "${transaction.name}"`,
      }
    },
  }),

  defineTool({
    name: "transactions_delete",
    title: "Delete transactions",
    description: "Permanently delete transactions (up to 50) and their attachments. To hide one from reports instead, set its status to excluded.",
    kind: "destructive",
    confirm: true,
    input: { transaction_ids: z.array(z.uuid()).min(1).max(50) },
    describe: async ({ transaction_ids }, ctx) => {
      const rows = must(
        await ctx.db.select("transactions", "id, name, amount, currency").in("id", transaction_ids),
        "Transactions",
      ) as { name: string; amount: number; currency: string }[]
      if (rows.length === 0) throw new ToolError("None of those transactions were found")
      const first = rows[0]!
      const what =
        rows.length === 1 ? `"${first.name}" (${formatMoney(Number(first.amount), first.currency)})` : `${rows.length} transactions`
      return `Permanently delete ${what} and any attachments? This can't be undone.`
    },
    run: async ({ transaction_ids }, ctx) => {
      const { deleted } = await ctx.transactions.remove(transaction_ids)
      return {
        data: { deleted },
        entity: transaction_ids.length === 1 ? { type: "transaction", id: transaction_ids[0]! } : undefined,
        summary: `Deleted ${deleted} transaction${deleted === 1 ? "" : "s"}`,
      }
    },
  }),

  defineTool({
    name: "categories_create",
    title: "Create category",
    description: "Add a transaction category. Check categories_list first; names must be unique.",
    kind: "write",
    input: { name: z.string().min(1).max(100), color: z.string().max(30).optional().describe("CSS colour, e.g. #22c55e") },
    run: async (args, ctx) => {
      const { category } = await ctx.transactions.createCategory(args)
      return { data: { id: category.id, name: category.name }, entity: { type: "category", id: category.id }, summary: `Created category ${category.name}` }
    },
  }),

  defineTool({
    name: "category_rules_create",
    title: "Create category rule",
    description:
      'Always file transactions whose name or counterparty contains some text under a category (e.g. "KPLC" → Utilities). Also files existing uncategorised matches now.',
    kind: "write",
    input: { pattern: z.string().min(2).max(200).describe("Text to match, case-insensitive"), category_id: uuid("Category") },
    run: async (args, ctx) => {
      const { rule, applied } = await ctx.transactions.createRule(args)
      return {
        data: { id: rule.id, pattern: rule.pattern, applied_to_existing: applied },
        entity: { type: "category_rule", id: rule.id },
        summary: `Added rule "${rule.pattern}"${applied ? ` and filed ${applied} existing transaction${applied === 1 ? "" : "s"}` : ""}`,
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
    description: "Mark a bill as paid (today unless you give paid_on), or as unpaid again.",
    kind: "write",
    input: {
      id: uuid("Bill"),
      paid: z.boolean().optional().describe("Default true; false marks it unpaid again"),
      paid_on: z.iso.date().optional().describe("YYYY-MM-DD; defaults to today"),
    },
    run: async ({ id, paid = true, paid_on }, ctx) => {
      const { bill } = await ctx.bills.setPaid(id, paid, paid_on)
      const label = [bill.vendorName, bill.billNumber].filter(Boolean).join(" ") || "bill"
      return {
        data: { id, status: bill.status, paid_at: bill.paidAt },
        entity: { type: "bill", id },
        summary: `Marked ${label} ${paid ? "paid" : "unpaid"}`,
      }
    },
  }),

  defineTool({
    name: "bills_create",
    title: "Add bill",
    description: "Add a bill the business has to pay (a supplier invoice), with its due date. For documents already in the inbox use bills_from_inbox.",
    kind: "write",
    input: {
      vendor_name: z.string().min(1).max(300).describe("Supplier"),
      amount: z.number().nonnegative(),
      currency: z.string().length(3).optional().describe("ISO 4217 code; defaults to the organisation's base currency"),
      bill_number: z.string().max(100).optional(),
      issue_date: z.iso.date().optional().describe("YYYY-MM-DD"),
      due_date: z.iso.date().optional().describe("YYYY-MM-DD"),
      note: z.string().max(5000).optional(),
    },
    run: async (args, ctx) => {
      const { bill } = await ctx.bills.create(createBillSchema.parse({ ...args, currency: args.currency ?? ctx.org.baseCurrency }))
      return {
        data: { id: bill.id, app_url: `${ctx.appUrl}/bills?open=${bill.id}` },
        entity: { type: "bill", id: bill.id },
        summary: `Added a bill from ${bill.vendorName} for ${formatMoney(Number(bill.amount), bill.currency)}${bill.dueDate ? `, due ${bill.dueDate}` : ""}`,
      }
    },
  }),

  defineTool({
    name: "bills_update",
    title: "Update bill",
    description: "Change a bill's supplier, number, amount, currency, dates or note. Only the fields you pass change.",
    kind: "write",
    input: {
      id: uuid("Bill"),
      vendor_name: z.string().min(1).max(300).optional(),
      amount: z.number().nonnegative().optional(),
      currency: z.string().length(3).optional(),
      bill_number: z.string().max(100).optional(),
      issue_date: z.iso.date().optional(),
      due_date: z.iso.date().optional(),
      note: z.string().max(5000).optional(),
    },
    run: async ({ id, ...changes }, ctx) => {
      const defined = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined))
      if (Object.keys(defined).length === 0) throw new ToolError("Nothing to update")
      const { bill } = await ctx.bills.update(id, updateBillSchema.parse(defined))
      return { data: { id }, entity: { type: "bill", id }, summary: `Updated ${Object.keys(defined).join(", ")} on the ${bill.vendorName} bill` }
    },
  }),

  defineTool({
    name: "bills_from_inbox",
    title: "Make bill from inbox document",
    description: "Turn an inbox document (a supplier invoice the AI didn't file as a bill) into a bill. Use inbox_list to find it.",
    kind: "write",
    input: { inbox_item_id: uuid("Inbox document") },
    run: async ({ inbox_item_id }, ctx) => {
      const { bill } = await ctx.bills.fromInbox(inbox_item_id)
      return {
        data: { id: bill.id, status: bill.status },
        entity: { type: "bill", id: bill.id },
        summary: `Added a bill from ${bill.vendorName} for ${formatMoney(Number(bill.amount), bill.currency)}`,
      }
    },
  }),

  defineTool({
    name: "bills_delete",
    title: "Delete bill",
    description: "Permanently delete a bill. Its inbox document, if any, stays in the inbox.",
    kind: "destructive",
    confirm: true,
    input: { id: uuid("Bill") },
    describe: async ({ id }, ctx) => {
      const b = must(await ctx.db.select("bills", "vendor_name, bill_number, amount, currency").eq("id", id).maybeSingle(), "Bill") as {
        vendor_name: string
        bill_number: string | null
        amount: number
        currency: string
      }
      return `Delete the ${b.vendor_name}${b.bill_number ? ` ${b.bill_number}` : ""} bill for ${formatMoney(Number(b.amount), b.currency)}? This can't be undone.`
    },
    run: async ({ id }, ctx) => {
      const { bill } = await ctx.bills.remove(id)
      return { data: { deleted: true, id }, entity: { type: "bill", id }, summary: `Deleted the ${bill.vendorName} bill` }
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

  defineTool({
    name: "inbox_confirm_match",
    title: "Confirm inbox match",
    description: "Accept a suggested match from inbox_get: the document is attached to that transaction as its receipt.",
    kind: "write",
    input: { suggestion_id: uuid("Suggestion") },
    run: async ({ suggestion_id }, ctx) => {
      const { item, transactionId } = await ctx.inbox.confirmSuggestion(suggestion_id)
      return {
        data: { inbox_item_id: item.id, transaction_id: transactionId, status: item.status },
        entity: { type: "inbox_item", id: item.id },
        summary: `Matched "${item.displayName || item.fileName}" to its transaction`,
      }
    },
  }),

  defineTool({
    name: "inbox_decline_match",
    title: "Decline inbox match",
    description: "Reject a suggested match. The document goes back to waiting for a manual match; that pair is never suggested again.",
    kind: "write",
    input: { suggestion_id: uuid("Suggestion") },
    run: async ({ suggestion_id }, ctx) => {
      const { item } = await ctx.inbox.declineSuggestion(suggestion_id)
      return { data: { inbox_item_id: item.id, status: item.status }, entity: { type: "inbox_item", id: item.id }, summary: `Declined the suggested match for "${item.displayName || item.fileName}"` }
    },
  }),

  defineTool({
    name: "inbox_match",
    title: "Match inbox document",
    description: "Attach an inbox document to a transaction you chose (find it with transactions_list), when there's no suggestion or the suggestion was wrong.",
    kind: "write",
    input: { inbox_item_id: uuid("Inbox document"), transaction_id: uuid("Transaction") },
    run: async ({ inbox_item_id, transaction_id }, ctx) => {
      const { item } = await ctx.inbox.match(inbox_item_id, transaction_id)
      return { data: { inbox_item_id, transaction_id, status: item.status }, entity: { type: "inbox_item", id: inbox_item_id }, summary: `Matched "${item.displayName || item.fileName}" to a transaction` }
    },
  }),

  defineTool({
    name: "inbox_unmatch",
    title: "Unmatch inbox document",
    description: "Detach an inbox document from the transaction it was matched to. The file stays in the inbox.",
    kind: "write",
    input: { inbox_item_id: uuid("Inbox document") },
    run: async ({ inbox_item_id }, ctx) => {
      const { item } = await ctx.inbox.unmatch(inbox_item_id)
      return { data: { inbox_item_id, status: item.status }, entity: { type: "inbox_item", id: inbox_item_id }, summary: `Unmatched "${item.displayName || item.fileName}"` }
    },
  }),

  defineTool({
    name: "inbox_archive",
    title: "Archive inbox document",
    description: "Archive an inbox document you don't need to match (or restore one with archived: false).",
    kind: "write",
    input: { inbox_item_id: uuid("Inbox document"), archived: z.boolean().optional().describe("false to restore (default true)") },
    run: async ({ inbox_item_id, archived = true }, ctx) => {
      const current = await ctx.inbox.get(inbox_item_id)
      const status = archived ? "archived" : current.transactionId ? "done" : "pending"
      const { item } = await ctx.inbox.setStatus(inbox_item_id, status)
      return { data: { inbox_item_id, status: item.status }, entity: { type: "inbox_item", id: inbox_item_id }, summary: `${archived ? "Archived" : "Restored"} "${item.displayName || item.fileName}"` }
    },
  }),

  defineTool({
    name: "inbox_delete",
    title: "Delete inbox documents",
    description: "Permanently delete inbox documents (up to 50) and their files. A bill made from one is deleted with it. Prefer inbox_archive.",
    kind: "destructive",
    confirm: true,
    input: { inbox_item_ids: z.array(z.uuid()).min(1).max(50) },
    describe: async ({ inbox_item_ids }, ctx) => {
      const rows = must(await ctx.db.select("inbox_items", "id, display_name, file_name").in("id", inbox_item_ids), "Inbox documents") as {
        display_name: string | null
        file_name: string
      }[]
      if (rows.length === 0) throw new ToolError("None of those documents were found")
      const what = rows.length === 1 ? `"${rows[0]!.display_name || rows[0]!.file_name}"` : `${rows.length} inbox documents`
      return `Permanently delete ${what} and the file${rows.length === 1 ? "" : "s"}? Any bill made from ${rows.length === 1 ? "it" : "them"} is deleted too. This can't be undone.`
    },
    run: async ({ inbox_item_ids }, ctx) => {
      const { deleted } = await ctx.inbox.remove(inbox_item_ids)
      return { data: { deleted }, summary: `Deleted ${deleted} inbox document${deleted === 1 ? "" : "s"}` }
    },
  }),
]
