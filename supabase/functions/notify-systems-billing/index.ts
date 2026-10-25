import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { triggerNovu } from "../_shared/novu.ts"
import { SystemsBillingDraftsEmail, billingRunTitle, reasonText } from "../_shared/emails/systems-billing-drafts.tsx"
import type { BillingLine, BillingIssue } from "../_shared/emails/systems-billing-drafts.tsx"

const APP_URL = Deno.env.get("APP_URL") ?? "https://app.travadabooks.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

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

function periodLabel(billingDate: string | undefined): string {
  const d = billingDate ? new Date(billingDate) : new Date()
  if (isNaN(d.getTime())) return String(billingDate ?? "")
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const workerSecret = req.headers.get("X-Worker-Secret") ?? ""
    if (!(WORKER_SHARED_SECRET.length > 0 && timingSafeEqual(workerSecret, WORKER_SHARED_SECRET))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })
    }

    const orgId = Deno.env.get("SYSTEMS_BOOKS_ORG_ID") ?? ""
    if (!orgId) {
      console.error("notify-systems-billing: SYSTEMS_BOOKS_ORG_ID is not set — refusing request")
      return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers: corsHeaders })
    }

    const body = await req.json() as {
      billingDate?: string
      source?: string
      drafted?: BillingLine[]
      alreadyBilled?: BillingLine[]
      skipped?: BillingIssue[]
      errors?: BillingIssue[]
    }
    const drafted = body.drafted ?? []
    const alreadyBilled = body.alreadyBilled ?? []
    const skipped = body.skipped ?? []
    const errors = body.errors ?? []

    if (drafted.length + alreadyBilled.length + skipped.length + errors.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: corsHeaders })
    }

    const { data: members, error: membersError } = await db
      .from("organization_members")
      .select("user_id, users(email)")
      .eq("org_id", orgId)
      .in("role", ["owner", "admin"])
      .eq("status", "active")

    if (membersError) {
      console.error(`notify-systems-billing: recipient lookup failed:`, membersError)
      return new Response(JSON.stringify({ error: "Recipient lookup failed" }), { status: 500, headers: corsHeaders })
    }
    if (!members || members.length === 0) {
      console.warn(`notify-systems-billing: no active owner/admin in org ${orgId}`)
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: corsHeaders })
    }

    const label = periodLabel(body.billingDate)
    // The invoices page reads its status filter from the `filters` JSON param.
    const filters = encodeURIComponent(JSON.stringify([
      { columnId: "status", type: "option", operator: "is", values: ["draft"] },
    ]))
    const viewUrl = `${APP_URL}/invoices?filters=${filters}`

    const title = billingRunTitle(drafted.length, errors.length)
    const subject = drafted.length > 0 || errors.length > 0 ? `${title} — ${label}` : title

    const novuPayload = {
      billingDate: body.billingDate ?? null,
      source: body.source ?? null,
      draftedCount: drafted.length,
      alreadyBilledCount: alreadyBilled.length,
      skippedCount: skipped.length,
      errorCount: errors.length,
      drafted: drafted.slice(0, 5).map((l) => ({ customerName: l.customerName ?? l.clerkOrgId, invoiceNumber: l.invoiceNumber ?? null, total: l.total ?? null, currency: l.currency ?? null })),
      skipped: skipped.slice(0, 5).map((l) => ({ customerName: l.customerName ?? l.clerkOrgId, reason: reasonText(l.reason) })),
      errors: errors.slice(0, 5).map((l) => ({ customerName: l.customerName ?? l.clerkOrgId, reason: reasonText(l.reason) })),
      viewUrl,
    }

    const html = await render(
      React.createElement(SystemsBillingDraftsEmail, {
        periodLabel: label,
        drafted,
        alreadyBilled,
        skipped,
        errors,
        viewUrl,
      })
    )

    type UserFields = { email: string } | null
    let emailsSent = 0
    // Awaited before responding: the runtime may stop once the response is sent.
    const novuTasks: Promise<unknown>[] = []

    for (const member of members) {
      const email = (member.users as unknown as UserFields)?.email
      if (!email) continue

      try {
        const { error } = await resend.emails.send({
          from: `Travada Books <${FROM_EMAIL}>`,
          to: [email],
          subject,
          html,
        })
        if (error) {
          console.error(`notify-systems-billing: email failed for user ${member.user_id}:`, error)
        } else {
          emailsSent++
        }
      } catch (err) {
        console.error(`notify-systems-billing: email threw for user ${member.user_id}:`, err)
      }

      novuTasks.push(
        triggerNovu("systems-billing-drafts-ready", { subscriberId: member.user_id, email }, novuPayload)
          .catch((err) => console.error(`notify-systems-billing: novu trigger failed for user ${member.user_id}:`, err)),
      )
    }

    await Promise.allSettled(novuTasks)

    return new Response(JSON.stringify({ ok: true, emailsSent }), { headers: corsHeaders })
  } catch (err) {
    console.error("notify-systems-billing error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
