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
    const today = new Date().toISOString().split("T")[0]

    // Find all unpaid invoices whose due_date was today (first day overdue).
    // status "unpaid" covers sent invoices not yet paid. Adjust if you use
    // a different status value for overdue.
    const { data: invoices, error } = await db
      .from("invoices")
      .select("id, org_id, invoice_number, due_date, total, currency, customer_details, from_details, customer_id, token")
      .eq("due_date", today)
      .in("status", ["unpaid", "overdue"])

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

        // Resolve org owner email
        const { data: member } = await db
          .from("organization_members")
          .select("users(email)")
          .eq("org_id", invoice.org_id)
          .eq("role", "owner")
          .eq("status", "active")
          .single()

        const ownerEmail = (member?.users as unknown as { email: string } | null)?.email
        if (!ownerEmail) continue

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
          to: [ownerEmail],
          subject: `${label} to ${customerName} is now overdue`,
          html,
        })

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
