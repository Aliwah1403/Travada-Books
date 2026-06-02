import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { triggerNovu } from "../_shared/novu.ts"
import { shouldSend } from "../_shared/notification-prefs.ts"
import { QuoteDeclinedEmail } from "../_shared/emails/quote-declined.tsx"

const APP_URL = Deno.env.get("APP_URL") ?? "https://books.travadasys.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { token, reason } = await req.json()
    if (!token) return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: corsHeaders })

    const { data: quote, error: fetchError } = await db
      .from("quotes")
      .select("id, org_id, quote_number, total, currency, from_details, customer_details, status")
      .eq("token", token)
      .single()

    if (fetchError || !quote) return new Response(JSON.stringify({ error: "Quote not found" }), { status: 404, headers: corsHeaders })

    const { data: updatedRows, error: updateError } = await db
      .from("quotes")
      .update({
        status: "declined",
        declined_at: new Date().toISOString(),
        ...(reason ? { decline_reason: reason } : {}),
      })
      .eq("id", quote.id)
      .eq("status", "sent")
      .select("id")

    if (updateError) throw updateError
    if (!updatedRows?.length) {
      const status = quote.status
      if (status === "declined") {
        return new Response(JSON.stringify({ ok: true, alreadyDeclined: true }), { headers: corsHeaders })
      }
      if (status === "accepted") {
        return new Response(JSON.stringify({ error: "Quote has already been accepted", status: "accepted" }), { status: 409, headers: corsHeaders })
      }
      if (status === "expired") {
        return new Response(JSON.stringify({ error: "Quote has expired", status: "expired" }), { status: 409, headers: corsHeaders })
      }
      return new Response(JSON.stringify({ error: "Quote cannot be declined in its current state", status }), { status: 409, headers: corsHeaders })
    }

    const from = quote.from_details as Record<string, string> | null
    const customer = quote.customer_details as Record<string, string> | null

    const { data: ownerMembers } = await db
      .from("organization_members")
      .select("user_id, users(email)")
      .eq("org_id", quote.org_id)
      .eq("role", "owner")
      .eq("status", "active")

    const { data: org } = await db.from("organizations").select("email").eq("id", quote.org_id).single()
    const businessEmail = org?.email

    if (from && ownerMembers?.length) {
      const viewUrl = `${APP_URL}/quotes/${quote.id}`

      type OwnerEmail = { email: string } | null
      const ownerPrefs = await Promise.all(
        ownerMembers.map(async (m) => {
          const [sendEmail, sendInApp] = await Promise.all([
            shouldSend(m.user_id, quote.org_id, "quote.declined", "email"),
            shouldSend(m.user_id, quote.org_id, "quote.declined", "in_app"),
          ])
          return { userId: m.user_id, email: (m.users as unknown as OwnerEmail)?.email, sendEmail, sendInApp }
        })
      )

      if (businessEmail && ownerPrefs.some((p) => p.sendEmail)) {
        const html = await render(
          React.createElement(QuoteDeclinedEmail, {
            orgName: from.name,
            quoteNumber: quote.quote_number,
            customerName: customer?.name ?? "A customer",
            total: quote.total,
            currency: quote.currency,
            declineReason: reason,
            viewUrl,
          })
        )
        await resend.emails.send({
          from: `Travada Books <${FROM_EMAIL}>`,
          to: [businessEmail],
          subject: `Quote${quote.quote_number ? ` ${quote.quote_number}` : ""} declined by ${customer?.name ?? "customer"}`,
          html,
        })
      }

      for (const { userId, email: ownerEmail, sendInApp } of ownerPrefs) {
        if (sendInApp) {
          triggerNovu("quote-declined", { subscriberId: userId, email: ownerEmail }, {
            quoteNumber: quote.quote_number,
            customerName: customer?.name ?? "A customer",
            total: quote.total,
            currency: quote.currency,
            declineReason: reason ?? null,
            viewUrl,
          }).catch((err) => console.error("decline-quote: novu trigger failed:", err))
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (err) {
    console.error("decline-quote error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
