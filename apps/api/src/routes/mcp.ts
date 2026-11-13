import { StreamableHTTPTransport } from "@hono/mcp"
import { Hono } from "hono"
import type { AppEnv } from "../context.js"
import { createMcpServer } from "../mcp/server.js"
import type { McpContext } from "../mcp/types.js"
import { requireCaller } from "../middleware/require-caller.js"
import { invoiceServices, type ServiceCtx } from "../services/invoices.js"
import { quoteServices } from "../services/quotes.js"
import { customerServices } from "../services/customers.js"
import { billServices } from "../services/bills.js"
import { inboxServices } from "../services/inbox.js"
import { statementServices } from "../services/statements.js"
import { transactionServices } from "../services/transactions.js"
import { vaultServices } from "../services/vault.js"

export const mcp = new Hono<AppEnv>()

// Phase 2: a Supabase access token, same as /v1/*. Phase 3 adds OAuth for
// Claude and ChatGPT (WWW-Authenticate + protected-resource metadata).
mcp.use(requireCaller)

// Stateless: a fresh server per request, built for this caller (as Midday
// does). Nothing about one request leaks into the next.
mcp.all("/", async (c) => {
  const { caller, db, deps } = c.var

  const [{ data: org, error: orgError }, { data: user }] = await Promise.all([
    deps.serviceDb.from("organizations").select("name, base_currency, country_code").eq("id", caller.orgId).single(),
    deps.serviceDb.from("users").select("timezone, locale, date_format").eq("id", caller.userId).maybeSingle(),
  ])
  if (orgError || !org) return c.json({ error: "Organization not found" }, 404)

  const timezone = user?.timezone || "Africa/Nairobi"
  const services: ServiceCtx = {
    db: deps.db as ServiceCtx["db"],
    orgId: caller.orgId,
    userId: caller.userId,
    today: new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date()),
    timezone,
    effects: deps.effects,
  }
  const ctx: McpContext = {
    orgId: caller.orgId,
    userId: caller.userId,
    db,
    invoices: invoiceServices(services),
    quotes: quoteServices(services),
    customers: customerServices(services),
    bills: billServices(services),
    inbox: inboxServices(services),
    statements: statementServices(services),
    transactions: transactionServices(services),
    vault: vaultServices(services),
    org: { name: org.name, baseCurrency: org.base_currency ?? "KES", countryCode: org.country_code ?? null },
    user: {
      timezone,
      locale: user?.locale || "en",
      dateFormat: user?.date_format ?? null,
    },
    channel: "mcp",
    client: c.req.header("x-mcp-client") ?? null,
    appUrl: deps.appUrl,
  }

  const server = createMcpServer(ctx, { redis: deps.redis, analytics: deps.analytics })
  const transport = new StreamableHTTPTransport()
  await server.connect(transport)
  return transport.handleRequest(c)
})
