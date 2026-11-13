import { randomUUID } from "node:crypto"
import type { AnyTool, McpContext, ToolOutcome, ToolRuntime } from "./types.js"
import { ToolError } from "./types.js"

// Plan §7: confirmations enforced in code, not by the prompt.
//
// A tool marked `confirm` never runs when called. Its exact arguments are
// parked in Redis for 15 minutes under a random action ID, and the caller
// gets a summary to show the person. Only confirmPendingAction runs it, with
// the parked arguments — the model can't change them between the question
// and the action. GETDEL makes each action ID single-use.

export const PENDING_TTL_SECONDS = 15 * 60
const key = (actionId: string) => `assistant:pending:${actionId}`

type PendingAction = {
  tool: string
  args: unknown
  orgId: string
  userId: string
  channel: McpContext["channel"]
  client: string | null
  summary: string
}

export type NeedsConfirmation = {
  status: "needs_confirmation"
  action_id: string
  summary: string
  expires_in_seconds: number
}

/**
 * MCP clients (Claude, ChatGPT) already ask the person before any write tool
 * call, so there only destructive tools get the extra step. Chat channels have
 * no such prompt: every `confirm` tool waits for a Confirm button there.
 */
export function needsConfirmation(tool: AnyTool, ctx: McpContext): boolean {
  if (!tool.confirm && tool.kind !== "destructive") return false
  return ctx.channel !== "mcp" || tool.kind === "destructive"
}

export async function parkAction(
  tool: AnyTool,
  args: unknown,
  ctx: McpContext,
  runtime: ToolRuntime,
): Promise<NeedsConfirmation> {
  const summary = tool.describe ? await tool.describe(args as never, ctx) : `Run ${tool.title}?`
  const actionId = randomUUID()
  const pending: PendingAction = {
    tool: tool.name,
    args,
    orgId: ctx.orgId,
    userId: ctx.userId,
    channel: ctx.channel,
    client: ctx.client,
    summary,
  }
  await runtime.redis.set(key(actionId), JSON.stringify(pending), { EX: PENDING_TTL_SECONDS })
  return { status: "needs_confirmation", action_id: actionId, summary, expires_in_seconds: PENDING_TTL_SECONDS }
}

async function takeAction(actionId: string, ctx: McpContext, runtime: ToolRuntime): Promise<PendingAction> {
  const raw = await runtime.redis.getDel(key(actionId))
  if (!raw) throw new ToolError("This action has expired or was already used. Ask again to start over.")
  const pending = JSON.parse(raw) as PendingAction
  // Action IDs are unguessable, but never let one person confirm another's.
  if (pending.orgId !== ctx.orgId || pending.userId !== ctx.userId) {
    throw new ToolError("This action belongs to someone else.")
  }
  return pending
}

export async function confirmPendingAction(
  actionId: string,
  tools: Map<string, AnyTool>,
  ctx: McpContext,
  runtime: ToolRuntime,
): Promise<ToolOutcome> {
  const pending = await takeAction(actionId, ctx, runtime)
  const tool = tools.get(pending.tool)
  if (!tool) throw new ToolError(`Unknown tool ${pending.tool}`)

  try {
    const outcome = await tool.run(pending.args as never, ctx)
    await logAction(ctx, runtime, {
      tool: tool.name,
      status: "confirmed",
      summary: outcome.summary ?? pending.summary,
      entity: outcome.entity,
    })
    return outcome
  } catch (error) {
    await logAction(ctx, runtime, { tool: tool.name, status: "failed", summary: pending.summary, error })
    throw error
  }
}

export async function cancelPendingAction(actionId: string, ctx: McpContext, runtime: ToolRuntime) {
  const pending = await takeAction(actionId, ctx, runtime)
  await logAction(ctx, runtime, { tool: pending.tool, status: "cancelled", summary: pending.summary })
  return { status: "cancelled", summary: pending.summary }
}

// Plan §9: every write on every surface leaves a row in assistant_actions.
// A failed log never fails the action itself — the write already happened.
export async function logAction(
  ctx: McpContext,
  runtime: ToolRuntime,
  entry: {
    tool: string
    status: "done" | "confirmed" | "cancelled" | "failed"
    summary: string
    entity?: { type: string; id: string }
    error?: unknown
  },
) {
  const { error } = await ctx.db.insert("assistant_actions", {
    user_id: ctx.userId,
    channel: ctx.channel,
    client: ctx.client,
    tool: entry.tool,
    entity_type: entry.entity?.type ?? null,
    entity_id: entry.entity?.id ?? null,
    summary: entry.summary.slice(0, 500),
    status: entry.status,
    error: entry.error ? String(entry.error instanceof Error ? entry.error.message : entry.error).slice(0, 500) : null,
  })
  if (error) {
    console.error("[assistant_actions] log failed:", error.message)
    runtime.analytics.captureError(new Error(`assistant_actions insert failed: ${error.message}`), { tool: entry.tool })
  }
}
