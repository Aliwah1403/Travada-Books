import type { z } from "zod"
import type { Analytics } from "../lib/posthog.js"
import type { Redis } from "../lib/redis.js"
import type { ScopedDb } from "../lib/scoped.js"
import type { BillServices } from "../services/bills.js"
import type { CustomerServices } from "../services/customers.js"
import type { InvoiceServices } from "../services/invoices.js"
import type { QuoteServices } from "../services/quotes.js"
import type { StatementServices } from "../services/statements.js"
import type { TransactionServices } from "../services/transactions.js"

// Where a tool call came from. Drives the confirmation rule (§7) and is
// recorded on every assistant_actions row (§9).
export type Channel = "mcp" | "web" | "whatsapp" | "telegram" | "imessage" | "slack"

export type McpContext = {
  orgId: string
  userId: string
  /** Org-scoped data access. Tools never get the raw service-role client. */
  db: ScopedDb
  /** Bill writes — the same services as /v1/bills. */
  bills: BillServices
  /** Customer writes — the same services as /v1/customers. */
  customers: CustomerServices
  /** Invoice and payment writes — the same services the app's /v1 routes use. */
  invoices: InvoiceServices
  /** Quote writes — the same services as /v1/quotes. */
  quotes: QuoteServices
  /** Statement writes — the same services as /v1/statements. */
  statements: StatementServices
  /** Transaction, category and rule writes — the same services as /v1/transactions. */
  transactions: TransactionServices
  org: { name: string; baseCurrency: string; countryCode: string | null }
  user: { timezone: string; locale: string; dateFormat: string | null }
  channel: Channel
  /** The MCP client's name ("Claude", "ChatGPT") when channel is "mcp". */
  client: string | null
  appUrl: string
}

// Runtime services the tool layer needs beyond the context: Redis for pending
// confirmations, analytics for errors.
export type ToolRuntime = {
  redis: Pick<Redis, "set" | "getDel">
  analytics: Analytics
}

/**
 * read        — no side effects.
 * write       — changes data; logged to assistant_actions.
 * destructive — deletes or can't be undone; logged, and always confirmed.
 */
export type ToolKind = "read" | "write" | "destructive"

export type ToolOutcome = {
  data: unknown
  /** The record the tool acted on, for the action log. */
  entity?: { type: string; id: string }
  /** One line for the action log and the confirmation message. */
  summary?: string
}

export type ToolDef<Shape extends z.ZodRawShape = z.ZodRawShape> = {
  name: string
  title: string
  description: string
  input: Shape
  kind: ToolKind
  /**
   * Bold tools in plan §5: anything that sends to a customer, moves money
   * records or deletes. They don't run when called — they return
   * needs_confirmation and the runtime runs them after the person confirms.
   */
  confirm?: boolean
  /** Human sentence for the confirmation prompt, e.g. "Record KES 5,000 on INV-042?". */
  describe?: (args: z.infer<z.ZodObject<Shape>>, ctx: McpContext) => Promise<string>
  run: (args: z.infer<z.ZodObject<Shape>>, ctx: McpContext) => Promise<ToolOutcome>
}

// Tools with different input shapes in one list; args are validated by the
// SDK against each tool's own schema before run() sees them.
export type AnyTool = Omit<ToolDef, "describe" | "run"> & {
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous tool list
  describe?: (args: any, ctx: McpContext) => Promise<string>
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous tool list
  run: (args: any, ctx: McpContext) => Promise<ToolOutcome>
}

export function defineTool<Shape extends z.ZodRawShape>(def: ToolDef<Shape>): ToolDef<Shape> {
  return def
}

/** Thrown by tools for expected failures; the message is shown to the model. */
export class ToolError extends Error {}
