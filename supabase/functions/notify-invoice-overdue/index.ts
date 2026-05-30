import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { InvoiceOverdueAlertEmail } from "../_shared/emails/invoice-overdue-alert.tsx"

const APP_URL = Deno.env.get("APP_URL") ?? "https://books.travadasys.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Called by a scheduled job (pg_cron / Supabase scheduled function).
// No user auth — uses service role. Finds all invoices that crossed their
// due date today and sends an alert to the org owner.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const nowUtc = new Date()
    // UTC date used as a safe upper bound; per-invoice "today" is resolved
    // against the org owner's timezone after the owner lookup.
    const todayUtc = nowUtc.toISOString().split("T")[0]

    // Find all unpaid/overdue invoices whose due_date has passed (UTC upper
    // bound) and for which we have not yet sent an overdue alert. Using lte
    // instead of eq means invoices are caught even if the cron job skipped a
    // day, and overdue_alert_sent_at IS NULL makes sends idempotent on retries.
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
        // Resolve customer name
        let customerName = (invoice.customer_details as Record<string, string> | null)?.name ?? null
        if (!customerName && invoice.customer_id) {
          const { data: cust } = await db.from("customers").select("name").eq("id", invoice.customer_id).single()
          customerName = cust?.name ?? "your customer"
        }

        // Resolve org owner emails and timezone (may be multiple active owners)
        const { data: members, error: membersError } = await db
          .from("organization_members")
          .select("users(email, timezone)")
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
        const ownerEmails = members
          .map((m) => (m.users as unknown as UserFields)?.email)
          .filter((e): e is string => Boolean(e))

        if (ownerEmails.length === 0) {
          console.warn(`notify-invoice-overdue: owner rows found but no emails resolved for org ${invoice.org_id}, skipping invoice ${invoice.id}`)
          continue
        }

        // Use the first owner's timezone to determine "today" locally.
        // All owners share one org so they're almost certainly in the same zone.
        const ownerTz = (members[0].users as unknown as UserFields)?.timezone ?? "UTC"
        const todayLocal = nowUtc.toLocaleDateString("en-CA", { timeZone: ownerTz }) // "YYYY-MM-DD"
        if (invoice.due_date > todayLocal) {
          // UTC query may have pulled this invoice early relative to the owner's
          // local date — skip until the due date has actually arrived locally.
          continue
        }

        // Org name for the subject line
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

        const label = invoice.invoice_number ? `Invoice ${invoice.invoice_number}` : "Invoice"
        await resend.emails.send({
          from: `Travada Books <${FROM_EMAIL}>`,
          to: ownerEmails,
          subject: `${label} to ${customerName} is now overdue`,
          html,
        })

        // Mark as alerted so retries and future cron runs don't resend.
        const { error: stampError } = await db
          .from("invoices")
          .update({ overdue_alert_sent_at: new Date().toISOString() })
          .eq("id", invoice.id)
        if (stampError) {
          console.error(`notify-invoice-overdue: failed to stamp overdue_alert_sent_at for invoice ${invoice.id}:`, stampError)
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
