import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { triggerNovu } from "../_shared/novu.ts"
import { shouldSend } from "../_shared/notification-prefs.ts"
import { QuoteExpiredEmail } from "../_shared/emails/quote-expired.tsx"

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const workerSecret = req.headers.get("X-Worker-Secret") ?? ""
    const calledByWorker = WORKER_SHARED_SECRET.length > 0 && timingSafeEqual(workerSecret, WORKER_SHARED_SECRET)

    if (!calledByWorker) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })
    }

    const { quoteIds } = await req.json()
    if (!Array.isArray(quoteIds) || quoteIds.length === 0) {
      return new Response(JSON.stringify({ error: "quoteIds required" }), { status: 400, headers: corsHeaders })
    }

    const { data: quotes, error } = await db
      .from("quotes")
      .select("id, org_id, quote_number, total, currency, valid_until, customer_name, customer_details, customer_id, status")
      .in("id", quoteIds)
      .eq("status", "expired")

    if (error) throw error
    if (!quotes || quotes.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: corsHeaders })
    }

    // Group quotes by org so we only look up owners/business email once per org.
    type QuoteRow = NonNullable<typeof quotes>[number]
    const quotesByOrg = new Map<string, QuoteRow[]>()
    for (const quote of quotes) {
      const list = quotesByOrg.get(quote.org_id) ?? []
      list.push(quote)
      quotesByOrg.set(quote.org_id, list)
    }

    let sent = 0

    for (const [orgId, orgQuotes] of quotesByOrg) {
      const { data: members, error: membersError } = await db
        .from("organization_members")
        .select("user_id, users(email)")
        .eq("org_id", orgId)
        .eq("role", "owner")
        .eq("status", "active")

      if (membersError) {
        console.error(`notify-quote-expired: owner lookup failed for org ${orgId}:`, membersError)
        continue
      }
      if (!members || members.length === 0) {
        console.warn(`notify-quote-expired: no active owner found for org ${orgId}, skipping ${orgQuotes.length} quote(s)`)
        continue
      }

      const { data: orgData } = await db.from("organizations").select("email").eq("id", orgId).single()
      if (!orgData?.email) {
        console.warn(`notify-quote-expired: no business email for org ${orgId}, email notifications skipped`)
      }

      type UserFields = { email: string } | null

      for (const quote of orgQuotes) {
        try {
          let customerName = (quote.customer_details as Record<string, string> | null)?.name ?? quote.customer_name
          if (!customerName && quote.customer_id) {
            const { data: cust } = await db.from("customers").select("name").eq("id", quote.customer_id).single()
            customerName = cust?.name ?? "your customer"
          }
          customerName = customerName ?? "your customer"

          const viewUrl = `${APP_URL}/quotes/${quote.id}`
          const novuPayload = {
            quoteNumber: quote.quote_number,
            customerName,
            total: quote.total,
            currency: quote.currency,
            validUntil: quote.valid_until,
            viewUrl,
          }

          // Send the Resend email at most once per quote, even though we
          // iterate per-owner below to gate Novu — the org business email is
          // a single shared inbox, not one per owner.
          let emailSent = false

          for (const member of members) {
            const email = (member.users as unknown as UserFields)?.email
            if (!email) continue
            const [sendEmail, sendInApp] = await Promise.all([
              shouldSend(member.user_id, orgId, "quote.expired", "email"),
              shouldSend(member.user_id, orgId, "quote.expired", "in_app"),
            ])

            if (sendEmail && orgData?.email && !emailSent) {
              const html = await render(
                React.createElement(QuoteExpiredEmail, {
                  quoteNumber: quote.quote_number,
                  customerName,
                  total: quote.total,
                  currency: quote.currency,
                  validUntil: quote.valid_until,
                  viewUrl,
                })
              )
              await resend.emails.send({
                from: `Travada Books <${FROM_EMAIL}>`,
                to: [orgData.email],
                subject: `Quote${quote.quote_number ? ` ${quote.quote_number}` : ""} to ${customerName} expired`,
                html,
              })
              emailSent = true
            }

            if (sendInApp) {
              triggerNovu("quote-expired", { subscriberId: member.user_id, email }, novuPayload)
                .catch((err) => console.error(`notify-quote-expired: novu trigger failed for ${quote.id}:`, err))
            }
          }

          sent++
        } catch (quoteErr) {
          console.error(`notify-quote-expired: failed for quote ${quote.id}:`, quoteErr)
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), { headers: corsHeaders })
  } catch (err) {
    console.error("notify-quote-expired error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
