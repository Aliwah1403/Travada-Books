import React from "react";
import { schedules, logger } from "@trigger.dev/sdk";
import { render } from "@react-email/render";
import { Resend } from "resend";
import { supabase } from "../lib/supabase";
import { InvoiceReminderEmail } from "../emails/invoice-reminder";

const FROM_EMAIL = "noreply@mail.travadasys.com";
const APP_URL = "https://books.travadasys.com";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const invoiceReminders = schedules.task({
  id: "invoice-reminders",
  // 5 AM UTC = 8 AM EAT — business-hours delivery for Nairobi
  cron: "0 5 * * *",
  maxDuration: 300,
  queue: { concurrencyLimit: 1 },
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
    randomize: true,
  },
  run: async () => {
    logger.log("Invoice reminders: starting");

    // Get all orgs that have auto-reminders configured
    const { data: templates, error: templateError } = await supabase
      .from("invoice_templates")
      .select("org_id, reminder_days_after_due")
      .eq("is_default", true)
      .not("reminder_days_after_due", "is", null);

    if (templateError) {
      throw new Error(`Failed to query invoice templates: ${templateError.message}`);
    }
    if (!templates?.length) return { sent: 0 };

    const now = new Date();
    let totalSent = 0;

    for (const template of templates) {
      const days = template.reminder_days_after_due as number;
      const orgId = template.org_id as string;

      // Resolve org owner timezone so window dates use the org-local calendar.
      const { data: member } = await supabase
        .from("organization_members")
        .select("users(timezone)")
        .eq("org_id", orgId)
        .eq("role", "owner")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      const tz = (member?.users as { timezone?: string | null } | null)?.timezone ?? "UTC";

      // Target: invoices due exactly `days` days ago in org-local time.
      // Lookback: also catch invoices from the prior 7 days in case the cron
      // skipped a day — last_reminder_sent_at guards against double-sends.
      // "en-CA" locale produces "YYYY-MM-DD" matching the DB date column format.
      const targetDateStr = new Date(now.getTime() - days * MS_PER_DAY)
        .toLocaleDateString("en-CA", { timeZone: tz });
      const earliestDateStr = new Date(now.getTime() - (days + 7) * MS_PER_DAY)
        .toLocaleDateString("en-CA", { timeZone: tz });

      const { data: invoices, error: invoiceError } = await supabase
        .from("invoices")
        .select("id, org_id, customer_id, invoice_number, due_date, total, currency, token, from_details, customer_details")
        .eq("status", "overdue")
        .eq("org_id", orgId)
        .gte("due_date", earliestDateStr)
        .lte("due_date", targetDateStr)
        .is("last_reminder_sent_at", null);

      if (invoiceError) {
        logger.error("Failed to query invoices for reminders", {
          orgId,
          days,
          error: invoiceError.message,
        });
        continue;
      }

      for (const invoice of invoices ?? []) {
        try {
          // Atomically claim this invoice before sending. The .is() condition
          // means only one concurrent worker wins; 0 rows back = already claimed.
          const { data: stamped, error: stampError } = await supabase
            .from("invoices")
            .update({ last_reminder_sent_at: new Date().toISOString() })
            .is("last_reminder_sent_at", null)
            .eq("id", invoice.id)
            .select("id");

          if (stampError) {
            logger.error("Failed to stamp last_reminder_sent_at", {
              invoiceId: invoice.id,
              error: stampError.message,
            });
            continue;
          }
          if (!stamped || stamped.length === 0) {
            // Another worker already claimed this invoice — skip to avoid duplicate send.
            continue;
          }

          let from = invoice.from_details as Record<string, string> | null;
          let customer = invoice.customer_details as Record<string, string> | null;

          if (!from) {
            const { data: org } = await supabase
              .from("organizations")
              .select("name, email, logo_url, phone, tax_id, address_line1, country_code")
              .eq("id", invoice.org_id)
              .single();
            if (org) from = org as unknown as Record<string, string>;
          }

          if (!customer && invoice.customer_id) {
            const { data: cust } = await supabase
              .from("customers")
              .select("name, email, billing_email")
              .eq("id", invoice.customer_id)
              .single();
            if (cust) customer = cust as unknown as Record<string, string>;
          }

          if (!from) {
            logger.warn("Could not resolve org details for reminder, skipping", { invoiceId: invoice.id });
            continue;
          }
          if (!customer) {
            logger.warn("Could not resolve customer details for reminder, skipping", { invoiceId: invoice.id });
            continue;
          }

          const recipientEmail = (customer.billing_email || customer.email) as string;
          if (!recipientEmail) {
            logger.warn("Customer has no email, skipping reminder", { invoiceId: invoice.id });
            continue;
          }

          const todayLocal = new Date().toLocaleDateString("en-CA", { timeZone: tz });
          const daysOverdue = invoice.due_date
            ? Math.max(0, Math.floor((new Date(todayLocal).getTime() - new Date(invoice.due_date).getTime()) / MS_PER_DAY))
            : 0;

          const publicUrl = invoice.token ? `${APP_URL}/i/${invoice.token}` : APP_URL;
          const html = await render(
            React.createElement(InvoiceReminderEmail, {
              orgName: from.name,
              orgLogoUrl: from.logo_url,
              orgEmail: from.email,
              customerName: customer.name,
              invoiceNumber: invoice.invoice_number,
              dueDate: invoice.due_date,
              total: invoice.total,
              currency: invoice.currency,
              publicUrl,
            })
          );

          const label = invoice.invoice_number ? `Invoice ${invoice.invoice_number}` : "Invoice";
          const resend = new Resend(process.env.RESEND_API_KEY);
          const { error: emailError } = await resend.emails.send({
            from: `${from.name} <${FROM_EMAIL}>`,
            to: [recipientEmail],
            replyTo: from.email,
            subject: `Reminder: ${label} from ${from.name} ${daysOverdue > 0 ? "is overdue" : "is due"}`,
            html,
          });

          if (emailError) {
            logger.warn("Resend error sending reminder", {
              invoiceId: invoice.id,
              error: (emailError as { message: string }).message,
            });
            continue;
          }

          totalSent++;
        } catch (err) {
          logger.error("Unexpected error sending reminder", {
            invoiceId: invoice.id,
            error: String(err),
          });
        }
      }
    }

    logger.log("Invoice reminders: complete", { sent: totalSent });
    return { sent: totalSent };
  },
});
