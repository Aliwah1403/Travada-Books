const TRIGGER_API = "https://api.trigger.dev/api/v1"
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 120_000
const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELED", "CRASHED", "TIMED_OUT", "SYSTEM_FAILURE"])

function getSecretKey(): string {
  const key = Deno.env.get("TRIGGER_SECRET_KEY")
  if (!key) throw new Error("TRIGGER_SECRET_KEY not configured")
  return key
}

export async function triggerAndAwait(taskId: string, payload: unknown): Promise<unknown> {
  const secretKey = getSecretKey()

  const triggerRes = await fetch(`${TRIGGER_API}/tasks/${taskId}/trigger`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${secretKey}`,
    },
    body: JSON.stringify({ payload }),
  })

  if (!triggerRes.ok) {
    const body = await triggerRes.text()
    throw new Error(`Trigger.dev trigger failed (${triggerRes.status}): ${body}`)
  }

  const { id: runId } = await triggerRes.json() as { id: string }

  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

    const pollRes = await fetch(`${TRIGGER_API}/runs/${runId}`, {
      headers: { "Authorization": `Bearer ${secretKey}` },
    })

    if (!pollRes.ok) {
      console.error("poll error", pollRes.status, await pollRes.text())
      continue
    }

    const run = await pollRes.json() as {
      status: string
      output?: unknown
      outputPresignedUrl?: string
    }

    console.log("poll run", JSON.stringify({ status: run.status, hasOutput: run.output !== undefined, hasPresignedUrl: !!run.outputPresignedUrl }))

    if (run.status === "COMPLETED") {
      if (run.output !== undefined && run.output !== null) return run.output
      if (run.outputPresignedUrl) {
        const outputRes = await fetch(run.outputPresignedUrl)
        return await outputRes.json()
      }
      return run.output ?? null
    }
    if (TERMINAL.has(run.status)) throw new Error(`Task ended with status: ${run.status}`)
  }

  throw new Error(`Timed out waiting for task ${taskId} (run ${runId})`)
}
