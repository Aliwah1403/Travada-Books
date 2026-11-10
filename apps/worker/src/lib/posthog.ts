import { logger } from "@trigger.dev/sdk";

const CAPTURE_URL = "https://eu.i.posthog.com/capture/";

// Product events from background tasks. distinctId is a user id, matching
// posthog.identify() in the app. Analytics must never fail a task, so errors
// are logged and swallowed, and an unset POSTHOG_API_KEY turns this into a no-op.
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch(CAPTURE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, event, distinct_id: distinctId, properties }),
    });
    if (!res.ok) logger.warn("posthog capture failed", { event, status: res.status });
  } catch (err) {
    logger.warn("posthog capture threw", { event, error: String(err) });
  }
}
