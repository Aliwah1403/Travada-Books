const NOVU_API_URL = "https://api.novu.co/v1"
const NOVU_SECRET_KEY = Deno.env.get("NOVU_SECRET_KEY") ?? ""

type NovuSubscriber = {
  subscriberId: string
  email: string
  firstName?: string
}

export async function triggerNovu(
  workflowId: string,
  to: NovuSubscriber,
  payload: Record<string, unknown>
): Promise<void> {
  if (!NOVU_SECRET_KEY) {
    console.error("triggerNovu: NOVU_SECRET_KEY is not set — aborting request")
    throw new Error("NOVU_SECRET_KEY is not configured")
  }

  const res = await fetch(`${NOVU_API_URL}/events/trigger`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `ApiKey ${NOVU_SECRET_KEY}`,
    },
    body: JSON.stringify({ name: workflowId, to, payload }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`triggerNovu: ${workflowId} failed (${res.status}): ${body}`)
  }
}
