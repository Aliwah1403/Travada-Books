import { resend } from "../_shared/resend.ts"

/** PII hygiene: never log raw emails. Matches apps/worker/src/lib/resend.ts::hashEmail. */
async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.trim().toLowerCase())
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** Constant-time comparison of two equal-length hex strings. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

async function verifySignature(email: string, signature: string): Promise<boolean> {
  const secret = Deno.env.get("WORKER_SHARED_SECRET")
  if (!secret) return false

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email))
  const expected = toHex(sigBuffer)

  return timingSafeEqualHex(expected, signature.toLowerCase())
}

function htmlPage(message: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Travada Books</title>
  <style>
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f5f5f4;
      color: #292524;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
    }
    .card {
      max-width: 420px;
      background: #fff;
      border: 1px solid #e7e5e4;
      border-radius: 12px;
      padding: 32px;
      text-align: center;
    }
    h1 { font-size: 18px; margin: 0 0 8px; }
    p { font-size: 14px; color: #78716c; line-height: 1.6; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Travada Books</h1>
    <p>${message}</p>
  </div>
</body>
</html>`
}

function htmlResponse(message: string, status = 200): Response {
  return new Response(htmlPage(message), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  const url = new URL(req.url)
  const e = url.searchParams.get("e")
  const s = url.searchParams.get("s")

  if (!e || !s) {
    return req.method === "POST"
      ? new Response(null, { status: 400 })
      : htmlResponse("This unsubscribe link is invalid.", 400)
  }

  let email: string
  try {
    const base64 = e.replace(/-/g, "+").replace(/_/g, "/").padEnd(e.length + ((4 - (e.length % 4)) % 4), "=")
    email = new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)))
  } catch {
    return req.method === "POST"
      ? new Response(null, { status: 400 })
      : htmlResponse("This unsubscribe link is invalid.", 400)
  }

  const valid = await verifySignature(email, s)
  if (!valid) {
    return req.method === "POST"
      ? new Response(null, { status: 400 })
      : htmlResponse("This unsubscribe link is invalid or has expired.", 400)
  }

  const audienceId = Deno.env.get("RESEND_AUDIENCE_ID")
  const emailHash = await hashEmail(email)

  if (audienceId) {
    const { error } = await resend.contacts.update({
      audienceId,
      email,
      unsubscribed: true,
    })

    if (error) {
      console.error("unsubscribe: resend contacts.update failed", { emailHash, error })
      // Still show a friendly confirmation — don't leak internals to the visitor,
      // and don't make a Resend hiccup look like a broken link.
    }
  } else {
    console.warn("unsubscribe: RESEND_AUDIENCE_ID not set, skipping", { emailHash })
  }

  console.log("unsubscribe: processed", { emailHash })

  if (req.method === "POST") {
    // RFC 8058 one-click unsubscribe (Gmail/Yahoo bulk-sender requirement).
    return new Response(null, { status: 200 })
  }

  return htmlResponse("You've been unsubscribed from Travada Books onboarding emails.")
})
