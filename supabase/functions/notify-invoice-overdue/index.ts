import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { triggerNovu } from "../_shared/novu.ts"
import { InvoiceOverdueAlertEmail } from "../_shared/emails/invoice-overdue-alert.tsx"

const APP_URL = Deno.env.get("APP_URL") ?? "https://books.travadasys.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const nowUtc = new Date()
    const todayUtc = nowUtc.toISOString().split("T")[0]

    const { data: invoices, error } = await db
      .from("invoices")
      .select("id, org_id, invoice_number, due_date, total, currency, customer_details, from_details, customer_id, token")
      .lte("due_date", todayUtc)
      .in("status", ["unpaid", "overdue"])
      .is("overdue_alert_sent_at", null)

    if (error) throw error
    if (!invoices || invoices.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: corsHeaders })
    }

    let sent = 0

    for (const invoice of invoices) {
      try {
        let customerName = (invoice.customer_details as Record<string, string> | null)?.name ?? null
        if (!customerName && invoice.customer_id) {
          const { data: cust } = await db.from("customers").select("name").eq("id", invoice.customer_id).single()
          customerName = cust?.name ?? "your customer"
        }

        const { data: members, error: membersError } = await db
          .from("organization_members")
          .select("user_id, users(email, timezone)")
          .eq("org_id", invoice.org_id)
          .eq("role", "owner")
          .eq("status", "active")

        if (membersError) {
          console.error(`notify-invoice-overdue: owner lookup failed for org ${invoice.org_id}:`, membersError)
          continue
        }
        if (!members || members.length === 0) {
          console.warn(`notify-invoice-overdue: no active owner found for org ${invoice.org_id}, skipping invoice ${invoice.id}`)
          continue
        }

        type UserFields = { email: string; timezone: string | null } | null
        const ownerTz = (members[0].users as unknown as UserFields)?.timezone ?? "UTC"
        const todayLocal = nowUtc.toLocaleDateString("en-CA", { timeZone: ownerTz })
        if (invoice.due_date > todayLocal) continue

        const { data: orgData } = await db.from("organizations").select("email").eq("id", invoice.org_id).single()
        if (!orgData?.email) {
          console.warn(`notify-invoice-overdue: no business email for org ${invoice.org_id}, skipping invoice ${invoice.id}`)
          continue
        }

        const orgName = (invoice.from_details as Record<string, string> | null)?.name ?? "Travada Books"

        const viewUrl = `${APP_URL}/invoices/${invoice.id}`
        const html = await render(
          React.createElement(InvoiceOverdueAlertEmail, {
            invoiceNumber: invoice.invoice_number,
            customerName: customerName ?? "your customer",
            total: invoice.total,
            currency: invoice.currency,
            viewUrl,
          })
        )

        const { data: stamped, error: stampError } = await db
          .from("invoices")
          .update({ overdue_alert_sent_at: new Date().toISOString() })
          .is("overdue_alert_sent_at", null)
          .eq("id", invoice.id)
          .select("id")
        if (stampError) {
          console.error(`notify-invoice-overdue: failed to stamp overdue_alert_sent_at for invoice ${invoice.id}:`, stampError)
          continue
        }
        if (!stamped || stamped.length === 0) continue

        const label = invoice.invoice_number ? `Invoice ${invoice.invoice_number}` : "Invoice"
        await resend.emails.send({
          from: `Travada Books <${FROM_EMAIL}>`,
          to: [orgData.email],
          subject: `${label} to ${customerName} is now overdue`,
          html,
        })

        const novuPayload = {
          invoiceNumber: invoice.invoice_number,
          customerName: customerName ?? "your customer",
          total: invoice.total,
          currency: invoice.currency,
          viewUrl,
        }
        for (const member of members) {
          const email = (member.users as unknown as UserFields)?.email
          if (!email) continue
          triggerNovu("invoice-overdue", { subscriberId: member.user_id, email }, novuPayload)
            .catch((err) => console.error(`notify-invoice-overdue: novu trigger failed for ${invoice.id}:`, err))
        }

        sent++
      } catch (invoiceErr) {
        console.error(`notify-invoice-overdue: failed for invoice ${invoice.id}:`, invoiceErr)
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), { headers: corsHeaders })
  } catch (err) {
    console.error("notify-invoice-overdue error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
