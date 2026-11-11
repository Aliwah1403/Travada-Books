import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"
import { cancelPendingAction, confirmPendingAction, logAction, needsConfirmation, parkAction } from "./actions.js"
import type { AnyTool, McpContext, ToolRuntime } from "./types.js"
import { defineTool, ToolError } from "./types.js"
import { TEXT_LIMIT } from "./util.js"

const ANNOTATIONS = {
  read: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  write: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  destructive: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
} as const

function textResult(value: unknown): CallToolResult {
  let text = JSON.stringify(value)
  if (text.length > TEXT_LIMIT) text = `${text.slice(0, TEXT_LIMIT)}… [truncated]`
  return { content: [{ type: "text", text }] }
}

function errorResult(error: unknown): CallToolResult {
  // Expected failures (not found, wrong state) go to the model verbatim;
  // anything else is logged and hidden behind a generic message.
  const message =
    error instanceof ToolError || error instanceof z.ZodError
      ? error.message
      : "Something went wrong running this tool."
  if (!(error instanceof ToolError)) console.error("[mcp] tool error:", error)
  return { content: [{ type: "text", text: message }], isError: true }
}

/**
 * Runs one tool call under the plan's rules. The single entry point for every
 * surface — the remote MCP endpoint, and later the in-process agent and bots.
 */
export async function executeTool(
  tool: AnyTool,
  args: unknown,
  ctx: McpContext,
  runtime: ToolRuntime,
): Promise<CallToolResult> {
  try {
    if (tool.kind === "read") {
      return textResult((await tool.run(args as never, ctx)).data)
    }

    if (needsConfirmation(tool, ctx)) {
      const parked = await parkAction(tool, args, ctx, runtime)
      return textResult({
        ...parked,
        next_step:
          ctx.channel === "mcp"
            ? "Show the summary to the user. Only if they explicitly agree, call actions_confirm with this action_id; otherwise call actions_cancel."
            : "The user has been asked to confirm. Do not retry.",
      })
    }

    try {
      const outcome = await tool.run(args as never, ctx)
      await logAction(ctx, runtime, {
        tool: tool.name,
        status: "done",
        summary: outcome.summary ?? tool.title,
        entity: outcome.entity,
      })
      return textResult(outcome.data)
    } catch (error) {
      await logAction(ctx, runtime, { tool: tool.name, status: "failed", summary: tool.title, error })
      throw error
    }
  } catch (error) {
    return errorResult(error)
  }
}

/**
 * Over MCP the person's approval of a tool call happens in their client
 * (Claude and ChatGPT ask before write tools), so confirming is itself a tool.
 * Chat channels don't get these: there a Confirm button calls
 * confirmPendingAction directly and the model is never involved.
 */
function confirmationTools(tools: Map<string, AnyTool>, runtime: ToolRuntime): AnyTool[] {
  return [
    defineTool({
      name: "actions_confirm",
      title: "Confirm a pending action",
      description:
        "Run an action that returned status needs_confirmation, after the user has explicitly agreed to its summary. Single use; expires after 15 minutes.",
      input: { action_id: z.uuid().describe("The action_id from the needs_confirmation response") },
      kind: "write",
      run: async ({ action_id }, ctx) => {
        const outcome = await confirmPendingAction(action_id, tools, ctx, runtime)
        return { data: outcome.data }
      },
    }),
    defineTool({
      name: "actions_cancel",
      title: "Cancel a pending action",
      description: "Discard an action that returned status needs_confirmation, when the user declines it.",
      input: { action_id: z.uuid().describe("The action_id from the needs_confirmation response") },
      kind: "write",
      run: async ({ action_id }, ctx) => ({ data: await cancelPendingAction(action_id, ctx, runtime) }),
    }),
  ]
}

export function registerTools(server: McpServer, tools: AnyTool[], ctx: McpContext, runtime: ToolRuntime) {
  const byName = new Map(tools.map((tool) => [tool.name, tool]))
  const all = ctx.channel === "mcp" ? [...tools, ...confirmationTools(byName, runtime)] : tools

  // The SDK types registerTool against its own copy of zod, which isn't the
  // one this workspace uses, so TypeScript sees two unrelated ZodType types.
  // At runtime they're compatible: the SDK recognises zod v4 schemas by shape.
  const register = server.registerTool.bind(server) as unknown as (
    name: string,
    config: { title: string; description: string; inputSchema: unknown; annotations: Record<string, unknown> },
    handler: (args: unknown) => Promise<CallToolResult>,
  ) => void

  for (const tool of all) {
    // Confirmation tools are logged by confirm/cancel themselves, not again here.
    const isConfirmationTool = tool.name === "actions_confirm" || tool.name === "actions_cancel"
    register(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.input,
        annotations: { title: tool.title, ...ANNOTATIONS[tool.kind] },
      },
      async (args: unknown) =>
        isConfirmationTool
          ? tool.run(args as never, ctx).then((outcome) => textResult(outcome.data), errorResult)
          : executeTool(tool, args, ctx, runtime),
    )
  }
}
