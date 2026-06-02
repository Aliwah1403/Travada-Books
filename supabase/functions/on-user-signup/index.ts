import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { WelcomeEmail } from "../_shared/emails/welcome.tsx"

const WORKER_SHARED_SECRET = Deno.env.get("WORKER_SHARED_SECRET") ?? ""

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

Deno.serve(async (req) => {
  const secret = req.headers.get("X-Worker-Secret") ?? ""
  if (!WORKER_SHARED_SECRET || !timingSafeEqual(secret, WORKER_SHARED_SECRET)) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json()
  const record = body.record as { id?: string; email?: string; full_name?: string }

  if (!record?.email) {
    return new Response("Missing email", { status: 400 })
  }

  const [firstName, ...rest] = (record.full_name ?? "").split(" ")
  const lastName = rest.join(" ") || undefined

  await resend.contacts.create({
    email: record.email,
    firstName: firstName || undefined,
    lastName,
    unsubscribed: false,
  })

  await resend.emails.send({
    from: `Travada Books <${FROM_EMAIL}>`,
    to: record.email,
    subject: "Welcome to Travada Books",
    html: await render(WelcomeEmail({ firstName: firstName || undefined })),
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  })
})
