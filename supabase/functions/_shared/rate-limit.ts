import { db } from "./db.ts"
import { trackServerEvent } from "./posthog.ts"

// Per-user limits, using Midday's numbers where it has an equivalent: chat
// 100 per 10 minutes for AI, its API limit of 1000 per 10 minutes, and 20 per
// 15 minutes for OAuth. Email is ours: Midday has no separate limit, but these
// functions send mail to addresses the caller chooses.
const SCOPES = {
  ai: { limit: 100, windowSeconds: 10 * 60 },
  api: { limit: 1000, windowSeconds: 10 * 60 },
  oauth: { limit: 20, windowSeconds: 15 * 60 },
  email: { limit: 100, windowSeconds: 10 * 60 },
}

export type RateLimitScope = keyof typeof SCOPES

// Returns the 429 to send back, or null when the request may go ahead. Fails
// open: a counter problem must not take AI search or invoice sending down.
export async function rateLimitResponse(
  scope: RateLimitScope,
  userId: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const { limit, windowSeconds } = SCOPES[scope]

  const { data: hits, error } = await db.rpc("hit_api_rate_limit", {
    p_key: `${scope}:${userId}`,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    console.error(`rate-limit: counter failed for ${scope} (allowing):`, error.message)
    return null
  }
  if (hits <= limit) return null

  if (hits === limit + 1) {
    await trackServerEvent(userId, "rate_limit_hit", { scope, limit, window_seconds: windowSeconds })
  }

  const elapsed = Math.floor(Date.now() / 1000) % windowSeconds
  return new Response(
    JSON.stringify({
      code: "RATE_LIMIT_EXCEEDED",
      error: "You've made a lot of requests in a short time. Please try again in a few minutes.",
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(windowSeconds - elapsed),
      },
    },
  )
}
