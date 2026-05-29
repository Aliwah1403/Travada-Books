import { schedules, logger } from "@trigger.dev/sdk/v3";
import { supabase } from "../lib/supabase";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WORKER_SHARED_SECRET = process.env.WORKER_SHARED_SECRET!;

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

    // Group org IDs by their reminder cadence
    const byDays = new Map<number, string[]>();
    for (const t of templates) {
      const days = t.reminder_days_after_due as number;
      const list = byDays.get(days) ?? [];
      list.push(t.org_id);
      byDays.set(days, list);
    }

    let totalSent = 0;

    for (const [days, orgIds] of byDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - days);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      const { data: invoices, error: invoiceError } = await supabase
        .from("invoices")
        .select("id")
        .eq("status", "overdue")
        .eq("due_date", targetDateStr)
        .is("last_reminder_sent_at", null)
        .in("org_id", orgIds);

      if (invoiceError) {
        logger.error("Failed to query invoices for reminders", {
          days,
          error: invoiceError.message,
        });
        continue;
      }

      for (const invoice of invoices ?? []) {
        try {
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

          await supabase
            .from("invoices")
            .update({ last_reminder_sent_at: new Date().toISOString() })
            .eq("id", invoice.id);

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
