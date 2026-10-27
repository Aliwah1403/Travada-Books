// Uploads the onboarding emails to Resend as published templates and creates (or
// replaces) the "Onboarding sequence" automation. The automation is left DISABLED —
// enable it in the Resend dashboard once the app is sending the signup event.
//
//   RESEND_API_KEY=re_… npx tsx scripts/sync-onboarding-emails.mts [--dry-run]
import React from "react"
import { render } from "@react-email/render"
import { ONBOARDING_SEQUENCE } from "../src/emails/onboarding/sequence"
import { buildOnboardingAutomation, ONBOARDING_FROM, ONBOARDING_REPLY_TO } from "../src/emails/onboarding/automation"

const API = "https://api.resend.com"
const dryRun = process.argv.includes("--dry-run")
const key = process.env.RESEND_API_KEY
if (!key && !dryRun) {
  console.error("RESEND_API_KEY is not set")
  process.exit(1)
}

async function resend<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`)
  return json as T
}

async function findTemplateId(alias: string): Promise<string | null> {
  try {
    const t = await resend<{ id: string }>("GET", `/templates/${alias}`)
    return t.id
  } catch {
    return null
  }
}

const templateIds: Record<string, string> = {}

for (const step of ONBOARDING_SEQUENCE) {
  const html = await render(React.createElement(step.Email))
  const body = {
    name: `Onboarding ${step.alias.replace("onboarding-", "")}`,
    alias: step.alias,
    subject: step.subject,
    from: ONBOARDING_FROM,
    reply_to: ONBOARDING_REPLY_TO,
    html,
  }

  if (dryRun) {
    templateIds[step.alias] = `dry_${step.alias}`
    console.log(`[dry-run] template ${step.alias} (${html.length} bytes)`)
    continue
  }

  let id = await findTemplateId(step.alias)
  if (id) {
    await resend("PATCH", `/templates/${id}`, body)
  } else {
    id = (await resend<{ id: string }>("POST", "/templates", body)).id
  }
  await resend("POST", `/templates/${id}/publish`)
  templateIds[step.alias] = id
  console.log(`published ${step.alias} → ${id}`)
}

const automation = buildOnboardingAutomation(templateIds)

if (dryRun) {
  console.log(JSON.stringify(automation, null, 2))
  process.exit(0)
}

const existing = await resend<{ data: { id: string; name: string }[] }>("GET", "/automations")
const current = existing.data.find((a) => a.name === automation.name)
if (current) {
  await resend("PATCH", `/automations/${current.id}`, {
    steps: automation.steps,
    connections: automation.connections,
  })
  console.log(`updated automation ${current.id} (status unchanged)`)
} else {
  const created = await resend<{ id: string }>("POST", "/automations", { ...automation, status: "disabled" })
  console.log(`created automation ${created.id} (disabled)`)
}
