import { z } from "zod"
import { defineTool, ToolError } from "../types.js"
import { likeTerm, listResult, must, page, pagination, uuid } from "../util.js"

const LIST_COLUMNS = "id, name, email, billing_email, phone, country, country_code, preferred_currency, is_archived, created_at"
const DETAIL_COLUMNS =
  "id, created_at, name, email, billing_email, billing_cc, phone, website, main_contact, address_line1, address_line2, city, state, zip, country, country_code, vat_number, note, preferred_currency, is_archived, industry, portal_enabled"

// Fields the assistant may set. Mirrors the customer form in the app.
const customerFields = {
  name: z.string().min(1).max(200).describe("Customer or company name"),
  email: z.email().optional().describe("Main contact email"),
  billing_email: z.email().optional().describe("Where invoices are sent, if different from email"),
  phone: z.string().max(50).optional(),
  website: z.string().max(200).optional(),
  main_contact: z.string().max(200).optional().describe("Contact person's name"),
  address_line1: z.string().max(200).optional(),
  address_line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  country_code: z.string().length(2).optional().describe("ISO 3166-1 alpha-2, e.g. KE"),
  vat_number: z.string().max(50).optional().describe("Tax ID / KRA PIN"),
  note: z.string().max(2000).optional(),
  preferred_currency: z.string().length(3).optional().describe("ISO 4217 code, e.g. KES"),
}

const OPEN_STATUSES = ["unpaid", "partially_paid", "overdue"]

export const customerTools = [
  defineTool({
    name: "customers_list",
    title: "List customers",
    description: "List customers, newest first. Optional search on name or email. Archived customers are excluded unless asked for.",
    kind: "read",
    input: {
      q: z.string().optional().describe("Search text matched against name and email"),
      include_archived: z.boolean().optional(),
      ...pagination,
    },
    run: async (args, ctx) => {
      const paging = page(args)
      let query = ctx.db.select("customers", LIST_COLUMNS)
      if (!args.include_archived) query = query.eq("is_archived", false)
      if (args.q) query = query.or(`name.ilike.${likeTerm(args.q)},email.ilike.${likeTerm(args.q)}`)
      const rows = must(await query.order("created_at", { ascending: false }).range(paging.from, paging.to), "List customers")
      return { data: listResult(rows, paging) }
    },
  }),

  defineTool({
    name: "customers_get",
    title: "Get customer",
    description: "Full customer details plus their invoice balance: total invoiced, total paid and what's still outstanding.",
    kind: "read",
    input: { id: uuid("Customer") },
    run: async ({ id }, ctx) => {
      const customer = must(await ctx.db.select("customers", DETAIL_COLUMNS).eq("id", id).maybeSingle(), "Customer") as Record<string, unknown>
      const invoices = must(
        await ctx.db
          .select("invoices", "status, currency, total, amount_paid")
          .eq("customer_id", id)
          .not("status", "in", "(draft,canceled)"),
        "Customer invoices",
      ) as { status: string; currency: string; total: number | null; amount_paid: number | null }[]

      // Per currency: a customer billed in two currencies has two balances.
      const balances: Record<string, { invoiced: number; paid: number; outstanding: number; open_invoices: number }> = {}
      for (const inv of invoices) {
        const b = (balances[inv.currency] ??= { invoiced: 0, paid: 0, outstanding: 0, open_invoices: 0 })
        b.invoiced += Number(inv.total ?? 0)
        b.paid += Number(inv.amount_paid ?? 0)
        if (OPEN_STATUSES.includes(inv.status)) {
          b.outstanding += Number(inv.total ?? 0) - Number(inv.amount_paid ?? 0)
          b.open_invoices += 1
        }
      }
      return { data: { ...customer, balances, app_url: `${ctx.appUrl}/customers/${id}` } }
    },
  }),

  defineTool({
    name: "customers_create",
    title: "Create customer",
    description: "Add a new customer. Check customers_list first to avoid creating a duplicate.",
    kind: "write",
    input: customerFields,
    run: async (args, ctx) => {
      const rows = must(await ctx.db.insert("customers", args).select("id, name"), "Create customer") as {
        id: string
        name: string
      }[]
      const created = rows[0]
      if (!created) throw new Error("Create customer: no row returned")
      return {
        data: { ...created, app_url: `${ctx.appUrl}/customers/${created.id}` },
        entity: { type: "customer", id: created.id },
        summary: `Created customer ${created.name}`,
      }
    },
  }),

  defineTool({
    name: "customers_update",
    title: "Update customer",
    description: "Change a customer's details. Only the fields you pass are changed.",
    kind: "write",
    input: { id: uuid("Customer"), ...z.object(customerFields).partial().shape },
    run: async ({ id, ...changes }, ctx) => {
      if (Object.keys(changes).length === 0) throw new ToolError("Nothing to update")
      const rows = must(await ctx.db.update("customers", changes).eq("id", id).select("id, name"), "Update customer") as {
        id: string
        name: string
      }[]
      const updated = rows[0]
      if (!updated) throw new ToolError("Customer not found")
      return {
        data: updated,
        entity: { type: "customer", id },
        summary: `Updated ${Object.keys(changes).join(", ")} on customer ${updated.name}`,
      }
    },
  }),
]
