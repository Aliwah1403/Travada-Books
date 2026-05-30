import { schedules, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WORKER_SHARED_SECRET = process.env.WORKER_SHARED_SECRET!;

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
        .select("id")
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

          const res = await fetch(`${SUPABASE_URL}/functions/v1/send-invoice-reminder`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "X-Worker-Secret": WORKER_SHARED_SECRET,
            },
            body: JSON.stringify({ invoiceId: invoice.id }),
          });

          if (!res.ok) {
            logger.warn("Reminder edge function returned error", {
              invoiceId: invoice.id,
              status: res.status,
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
