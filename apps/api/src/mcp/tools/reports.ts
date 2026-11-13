import { z } from "zod"
import { defineTool } from "../types.js"
import { dateContext, dateRange, likeTerm, listResult, must, page, pagination } from "../util.js"

// Reports reuse the exact RPCs behind the dashboard, so the assistant and the
// app never disagree on a number. Amounts are in the org's base currency.

const report = (
  name: string,
  title: string,
  description: string,
  fn: string,
  withRange: boolean,
  extra: Record<string, unknown> = {},
) =>
  defineTool({
    name,
    title,
    description: `${description} Amounts are in the organisation's base currency.`,
    kind: "read",
    input: withRange ? dateRange : {},
    run: async (args, ctx) => {
      const range = args as { from?: string; to?: string }
      const params = withRange ? { p_from: range.from, p_to: range.to, ...extra } : extra
      return { data: { currency: ctx.org.baseCurrency, result: must(await ctx.db.rpc(fn, params), title) } }
    },
  })

export const reportTools = [
  report("reports_revenue", "Revenue by month", "Income per month in a date range (gross).", "get_revenue_summary", true),
  report("reports_cash_flow", "Cash flow by month", "Income, expenses and net per month in a date range.", "get_cash_flow", true),
  report(
    "reports_expenses_by_category",
    "Expenses by category",
    "Spending in a date range grouped by category.",
    "get_expenses_by_category",
    true,
  ),
  report("reports_tax_summary", "Tax summary", "VAT and withholding tax collected and paid in a date range.", "get_tax_summary", true),
  report("reports_top_customers", "Top customers", "Customers ranked by revenue in a date range, with their share.", "get_top_customer", true),
  report("reports_customer_churn", "Customer churn", "Customers gained, retained and lost in a date range.", "get_customer_churn", true),
  report("reports_burn_rate", "Burn rate", "Average monthly net (income minus expenses) over recent months.", "get_burn_rate", false),
  report(
    "reports_runway",
    "Runway",
    "Cash balance and how many months it lasts at the current burn. Needs an opening balance set in settings.",
    "get_runway",
    false,
  ),
  report("reports_recurring_expenses", "Recurring expenses", "Expenses that repeat (subscriptions, rent…) and their monthly cost.", "get_recurring_expenses", false),
]

export const insightTools = [
  defineTool({
    name: "insights_latest",
    title: "Latest weekly insights",
    description: "The most recent weekly business summaries Travada wrote for this organisation, newest first.",
    kind: "read",
    input: { limit: z.number().int().min(1).max(8).optional().describe("How many weeks (default 1)") },
    run: async ({ limit = 1 }, ctx) => ({
      data: must(
        await ctx.db
          .select("insights", "id, period_start, period_end, currency, metrics, content, created_at")
          .order("period_start", { ascending: false })
          .limit(limit),
        "Insights",
      ),
    }),
  }),
]

export const searchTools = [
  defineTool({
    name: "search",
    title: "Search everything",
    description:
      "Search across customers, invoices, quotes, transactions, bills, statements, inbox and documents at once. Best first step when the user names something ('the Acme invoice', 'my KPLC bill').",
    kind: "read",
    input: {
      q: z.string().min(1).describe("What to look for"),
      limit: z.number().int().min(1).max(10).optional().describe("Results per type (default 5)"),
    },
    run: async ({ q, limit = 5 }, ctx) => ({
      data: must(await ctx.db.rpc("global_search", { p_term: q, p_limit: limit }), "Search"),
    }),
  }),

  defineTool({
    name: "documents_list",
    title: "List documents",
    description: "Files in the document vault (contracts, receipts, statements…), newest first, with their AI summary. Optional search on title and file name.",
    kind: "read",
    input: { q: z.string().optional(), ...pagination },
    run: async (args, ctx) => {
      const paging = page(args)
      let query = ctx.db.select("documents", "id, title, name, content_type, file_size, date, summary, source, transaction_id, created_at")
      if (args.q) query = query.or(`title.ilike.${likeTerm(args.q)},name.ilike.${likeTerm(args.q)}`)
      const rows = must(await query.order("created_at", { ascending: false }).range(paging.from, paging.to), "Documents")
      return { data: listResult(rows, paging) }
    },
  }),
]

export const orgTools = [
  defineTool({
    name: "org_get",
    title: "Organisation and context",
    description:
      "The organisation's name, base currency and country, the user's timezone and locale, today's date and common date ranges, and whether online card/M-Pesa payments are set up. Call first when you need any of these.",
    kind: "read",
    input: {},
    run: async (_args, ctx) => {
      const account = must(
        await ctx.db.select("payment_accounts", "provider, status, currency, cards_enabled").limit(1),
        "Payment account",
      ) as unknown[]
      return {
        data: {
          organisation: ctx.org,
          user: { timezone: ctx.user.timezone, locale: ctx.user.locale, date_format: ctx.user.dateFormat },
          dates: dateContext(ctx.user.timezone),
          online_payments: account[0] ?? null,
          app_url: ctx.appUrl,
        },
      }
    },
  }),
]
