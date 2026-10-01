import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { triggerNovu } from "../_shared/novu.ts"
import { shouldSend } from "../_shared/notification-prefs.ts"
import { InvoiceReminderUpcomingEmail } from "../_shared/emails/invoice-reminder-upcoming.tsx"

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

    const { invoiceIds } = await req.json()
    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return new Response(JSON.stringify({ error: "invoiceIds required" }), { status: 400, headers: corsHeaders })
    }

    const { data: invoices, error } = await db
      .from("invoices")
      .select("id, org_id, invoice_number, total, amount_paid, currency, customer_name, customer_details, customer_id, status")
      .in("id", invoiceIds)
      .in("status", ["overdue", "partially_paid"])

    if (error) throw error
    if (!invoices || invoices.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: corsHeaders })
    }

    // Group invoices by org so we only look up owners/business email once per org.
    type InvoiceRow = NonNullable<typeof invoices>[number]
    const invoicesByOrg = new Map<string, InvoiceRow[]>()
    for (const invoice of invoices) {
      const list = invoicesByOrg.get(invoice.org_id) ?? []
      list.push(invoice)
      invoicesByOrg.set(invoice.org_id, list)
    }

    let sent = 0

    for (const [orgId, orgInvoices] of invoicesByOrg) {
      const { data: members, error: membersError } = await db
        .from("organization_members")
        .select("user_id, users(email)")
        .eq("org_id", orgId)
        .eq("role", "owner")
        .eq("status", "active")

      if (membersError) {
        console.error(`notify-reminder-upcoming: owner lookup failed for org ${orgId}:`, membersError)
        continue
      }
      if (!members || members.length === 0) {
        console.warn(`notify-reminder-upcoming: no active owner found for org ${orgId}, skipping ${orgInvoices.length} invoice(s)`)
        continue
      }

      const { data: orgData } = await db.from("organizations").select("email").eq("id", orgId).single()
      if (!orgData?.email) {
        console.warn(`notify-reminder-upcoming: no business email for org ${orgId}, email notifications skipped`)
      }

      type UserFields = { email: string } | null

      for (const invoice of orgInvoices) {
        try {
          let customerName = (invoice.customer_details as Record<string, string> | null)?.name ?? invoice.customer_name
          if (!customerName && invoice.customer_id) {
            const { data: cust } = await db.from("customers").select("name").eq("id", invoice.customer_id).single()
            customerName = cust?.name ?? "your customer"
          }
          customerName = customerName ?? "your customer"

          const balanceDue = (invoice.total ?? 0) - (invoice.amount_paid ?? 0)
          const viewUrl = `${APP_URL}/invoices/${invoice.id}`
          const novuPayload = {
            invoiceNumber: invoice.invoice_number,
            customerName,
            balanceDue,
            currency: invoice.currency,
            viewUrl,
          }

          // Send the Resend email at most once per invoice, even though we
          // iterate per-owner below to gate Novu — the org business email is
          // a single shared inbox, not one per owner.
          let emailSent = false

          for (const member of members) {
            const email = (member.users as unknown as UserFields)?.email
            if (!email) continue
            const [sendEmail, sendInApp] = await Promise.all([
              shouldSend(member.user_id, orgId, "invoice.reminder_upcoming", "email"),
              shouldSend(member.user_id, orgId, "invoice.reminder_upcoming", "in_app"),
            ])

            if (sendEmail && orgData?.email && !emailSent) {
              const html = await render(
                React.createElement(InvoiceReminderUpcomingEmail, {
                  invoiceNumber: invoice.invoice_number,
                  customerName,
                  balanceDue,
                  currency: invoice.currency,
                  viewUrl,
                })
              )
              await resend.emails.send({
                from: `Travada Books <${FROM_EMAIL}>`,
                to: [orgData.email],
                subject: `Reminder for Invoice${invoice.invoice_number ? ` ${invoice.invoice_number}` : ""} goes out to ${customerName} tomorrow`,
                html,
              })
              emailSent = true
            }

            if (sendInApp) {
              triggerNovu("invoice-reminder-upcoming", { subscriberId: member.user_id, email }, novuPayload)
                .catch((err) => console.error(`notify-reminder-upcoming: novu trigger failed for ${invoice.id}:`, err))
            }
          }

          sent++
        } catch (invoiceErr) {
          console.error(`notify-reminder-upcoming: failed for invoice ${invoice.id}:`, invoiceErr)
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), { headers: corsHeaders })
  } catch (err) {
    console.error("notify-reminder-upcoming error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
