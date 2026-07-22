import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { triggerNovu } from "../_shared/novu.ts"
import { shouldSend } from "../_shared/notification-prefs.ts"
import { RecurringPausedEmail } from "../_shared/emails/recurring-paused.tsx"

const APP_URL = Deno.env.get("APP_URL") ?? "https://books.travadasys.com"

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const workerSecret = req.headers.get("X-Worker-Secret") ?? ""
    const calledByWorker = WORKER_SHARED_SECRET.length > 0 && timingSafeEqual(workerSecret, WORKER_SHARED_SECRET)

    if (!calledByWorker) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })
    }

    const { seriesId } = await req.json()
    if (!seriesId) return new Response(JSON.stringify({ error: "seriesId required" }), { status: 400, headers: corsHeaders })

    const { data: series, error } = await db
      .from("invoice_recurring")
      .select("id, org_id, customer_id, customer_name, frequency, status, failure_count, last_failure_reason, total, currency")
      .eq("id", seriesId)
      .single()

    if (error || !series) {
      return new Response(JSON.stringify({ error: "Series not found" }), { status: 404, headers: corsHeaders })
    }

    // Defensive: only notify for series that are actually paused. If a later
    // run resumed/advanced the series before this fired, skip quietly.
    if (series.status !== "paused") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: corsHeaders })
    }

    let customerName = series.customer_name as string | null
    if (!customerName && series.customer_id) {
      const { data: cust } = await db.from("customers").select("name").eq("id", series.customer_id).single()
      customerName = cust?.name ?? "your customer"
    }
    customerName = customerName ?? "your customer"

    const { data: members, error: membersError } = await db
      .from("organization_members")
      .select("user_id, users(email, timezone)")
      .eq("org_id", series.org_id)
      .eq("role", "owner")
      .eq("status", "active")

    if (membersError) {
      console.error(`notify-recurring-paused: owner lookup failed for org ${series.org_id}:`, membersError)
      return new Response(JSON.stringify({ error: "Owner lookup failed" }), { status: 500, headers: corsHeaders })
    }
    if (!members || members.length === 0) {
      console.warn(`notify-recurring-paused: no active owner found for org ${series.org_id}, skipping series ${series.id}`)
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: corsHeaders })
    }

    const { data: orgData } = await db.from("organizations").select("email").eq("id", series.org_id).single()
    if (!orgData?.email) {
      console.warn(`notify-recurring-paused: no business email for org ${series.org_id}, email notifications skipped for series ${series.id}`)
    }

    const viewUrl = `${APP_URL}/invoices`
    const reason = (series.last_failure_reason as string | null) ?? null
    const failureCount = series.failure_count as number

    type UserFields = { email: string; timezone: string | null } | null

    const novuPayload = {
      customerName,
      frequency: series.frequency,
      failureCount,
      reason,
      viewUrl,
    }

    // Send the Resend email at most once for the whole org, even though we
    // iterate per-owner below to gate Novu — the org business email is a
    // single shared inbox, not one per owner.
    let emailSent = false

    for (const member of members) {
      const email = (member.users as unknown as UserFields)?.email
      if (!email) continue

      const [sendEmail, sendInApp] = await Promise.all([
        shouldSend(member.user_id, series.org_id, "invoice.recurring_paused", "email"),
        shouldSend(member.user_id, series.org_id, "invoice.recurring_paused", "in_app"),
      ])

      if (sendEmail && orgData?.email && !emailSent) {
        const html = await render(
          React.createElement(RecurringPausedEmail, {
            customerName,
            frequency: series.frequency,
            failureCount,
            reason,
            viewUrl,
          })
        )
        await resend.emails.send({
          from: `Travada Books <${FROM_EMAIL}>`,
          to: [orgData.email],
          subject: `Recurring invoice to ${customerName} has been paused`,
          html,
        })
        emailSent = true
      }

      if (sendInApp) {
        triggerNovu("recurring-paused", { subscriberId: member.user_id, email }, novuPayload)
          .catch((err) => console.error(`notify-recurring-paused: novu trigger failed for ${series.id}:`, err))
      }
    }

    return new Response(JSON.stringify({ ok: true, emailSent }), { headers: corsHeaders })
  } catch (err) {
    console.error("notify-recurring-paused error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
