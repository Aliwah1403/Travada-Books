// Server-side PostHog AI Observability for Deno edge functions.
//
// @posthog/ai/otel uses @opentelemetry/sdk-node which is Node.js-specific and
// cannot run in Deno. This helper manually captures the same $ai_generation
// event schema so events appear in PostHog's AI Observability dashboard.
// See: https://posthog.com/docs/ai-observability/installation/vercel-ai

type AIGenerationProps = {
  distinctId: string   // org_id — identifies who triggered the generation
  model: string        // e.g. "gpt-4o-mini"
  provider: string     // e.g. "openai"
  functionId: string   // e.g. "csv_mapping", "document_extraction"
  inputTokens: number
  outputTokens: number
  latencyMs: number
  input?: string       // prompt text
  output?: string      // response text
  isError?: boolean
}

export function trackAIGeneration(props: AIGenerationProps): void {
  const apiKey = Deno.env.get("POSTHOG_API_KEY")
  if (!apiKey) return

  const payload = {
    api_key: apiKey,
    event: "$ai_generation",
    distinct_id: props.distinctId,
    properties: {
      $ai_provider: props.provider,
      $ai_model: props.model,
      $ai_input_tokens: props.inputTokens,
      $ai_output_tokens: props.outputTokens,
      $ai_latency: props.latencyMs / 1000,
      $ai_is_error: props.isError ?? false,
      ...(props.input ? { $ai_input: props.input } : {}),
      ...(props.output ? { $ai_output_choices: props.output } : {}),
      // Custom property to identify which feature triggered the generation
      $ai_trace_id: props.functionId,
    },
  }

  // Fire and forget — never block the response on analytics
  fetch("https://eu.i.posthog.com/capture/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {/* intentionally swallowed */})
}
