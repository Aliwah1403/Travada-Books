import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { registerTools } from "./registry.js"
import { customerTools } from "./tools/customers.js"
import { invoiceWriteTools } from "./tools/invoice-writes.js"
import { invoiceTools, paymentTools, quoteTools } from "./tools/invoices.js"
import { billTools, inboxTools, transactionTools } from "./tools/money.js"
import { insightTools, orgTools, reportTools, searchTools } from "./tools/reports.js"
import type { AnyTool, McpContext, ToolRuntime } from "./types.js"
import { dateContext } from "./util.js"

export const MCP_SERVER_VERSION = "0.1.0"

// Every tool, in one list. Phase 4's agent and the bots use the same list,
// so there is one definition of what the assistant can do.
export const allTools: AnyTool[] = [
  ...orgTools,
  ...searchTools,
  ...customerTools,
  ...invoiceTools,
  ...invoiceWriteTools,
  ...paymentTools,
  ...quoteTools,
  ...transactionTools,
  ...billTools,
  ...inboxTools,
  ...reportTools,
  ...insightTools,
]

function instructions(ctx: McpContext): string {
  const dates = dateContext(ctx.user.timezone)
  return `Travada Books is invoicing and bookkeeping for small businesses. You are connected to the organisation "${ctx.org.name}".

Today is ${dates.today} (${ctx.user.timezone}). This month starts ${dates.monthStart}, this quarter ${dates.quarterStart}, this year ${dates.yearStart}.
Base currency: ${ctx.org.baseCurrency}${ctx.org.countryCode ? `. Country: ${ctx.org.countryCode}` : ""}. Format money and dates for locale "${ctx.user.locale}".

Tools are grouped by prefix: customers_*, invoices_*, payments_*, quotes_*, transactions_*, categories_*, bills_*, inbox_*, documents_*, reports_*, insights_*, org_get, search.
- When the user names something, use search first to find its ID.
- Report tools take from/to dates (YYYY-MM-DD) and return base-currency amounts.
- Lists return next_offset when there's more; pass it as offset.
- Some actions return status "needs_confirmation" with a summary. Show the summary to the user and only call actions_confirm after they clearly agree.
- Share app_url / public_url links when pointing the user to a record.`
}

export function createMcpServer(ctx: McpContext, runtime: ToolRuntime): McpServer {
  const server = new McpServer(
    {
      name: "travada-books",
      title: "Travada Books",
      version: MCP_SERVER_VERSION,
      websiteUrl: "https://travadabooks.com",
    },
    { instructions: instructions(ctx) },
  )
  registerTools(server, allTools, ctx, runtime)
  return server
}
