import { schedules, logger, AbortTaskRunError } from "@trigger.dev/sdk/v3";
import { supabase } from "../lib/supabase";

const MAX_FAILURES = 3;
const BATCH_LIMIT = 50;

type Frequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

type RecurringSeries = {
  id: string;
  org_id: string;
  user_id: string;
  customer_id: string;
  customer_name: string;
  currency: string;
  line_items: unknown[];
  subtotal: number;
  tax_amount: number;
  discount: number;
  total: number;
  payment_details: string;
  note: string;
  accept_payments: boolean;
  invoice_template: string;
  from_details: unknown;
  customer_details: unknown;
  source_issue_date: string;
  source_due_date: string | null;
  frequency: Frequency;
  end_type: string;
  end_on_date: string | null;
  end_after_count: number | null;
  status: string;
  current_count: number;
  failure_count: number;
  next_scheduled_at: string;
};

function addFrequency(dateStr: string, frequency: Frequency): string {
  const d = new Date(dateStr + "T00:00:00Z");
  switch (frequency) {
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "biweekly":
      d.setUTCDate(d.getUTCDate() + 14);
      break;
    case "monthly":
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case "quarterly":
      d.setUTCMonth(d.getUTCMonth() + 3);
      break;
    case "yearly":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
  }
  return d.toISOString().split("T")[0];
}

function hasSeriesEnded(series: {
  end_type: string;
  end_on_date: string | null;
  end_after_count: number | null;
  current_count: number;
  source_issue_date: string;
  frequency: Frequency;
}): boolean {
  if (series.end_type === "after_count" && series.end_after_count != null) {
    return series.current_count >= series.end_after_count;
  }
  if (series.end_type === "on_date" && series.end_on_date) {
    const nextIssueDate = addFrequency(series.source_issue_date, series.frequency);
    return nextIssueDate > series.end_on_date;
  }
  return false;
}

export const recurringInvoiceGenerator = schedules.task({
  id: "recurring-invoice-generator",
  cron: "0 */2 * * *",
  maxDuration: 300,
  queue: { concurrencyLimit: 1 },
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async () => {
    if (process.env.DISABLE_RECURRING_INVOICES === "true") {
      logger.log("Recurring invoice generator: disabled via env flag, skipping");
      return { processed: 0, skipped: 0 };
    }

    const now = new Date().toISOString();
    logger.log("Recurring invoice generator: starting", { now });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recurringTable = (supabase as any).from("invoice_recurring");
    const { data: dueSeries, error: queryError } = await recurringTable
      .select(
        "id, org_id, user_id, customer_id, customer_name, currency, line_items, " +
        "subtotal, tax_amount, discount, total, payment_details, note, accept_payments, " +
        "invoice_template, from_details, customer_details, source_issue_date, source_due_date, " +
        "frequency, end_type, end_on_date, end_after_count, status, current_count, failure_count, " +
        "next_scheduled_at"
      )
      .eq("status", "active")
      .lte("next_scheduled_at", now)
      .limit(BATCH_LIMIT) as { data: RecurringSeries[] | null; error: { message: string } | null };

    if (queryError) {
      throw new Error(`Failed to query invoice_recurring: ${queryError.message}`);
    }

    if (!dueSeries?.length) {
      logger.log("Recurring invoice generator: no series due, exiting");
      return { processed: 0, skipped: 0 };
    }

    logger.log(`Recurring invoice generator: found ${dueSeries.length} series due`);

    let processed = 0;
    let skipped = 0;

    for (const series of dueSeries) {
      const seriesLog = { seriesId: series.id, customerId: series.customer_id };

      try {
        // Check end conditions before generating
        if (hasSeriesEnded(series)) {
          logger.log("Recurring invoice generator: series has ended, marking completed", seriesLog);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("invoice_recurring")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("id", series.id);
          skipped++;
          continue;
        }

        const nextSequence = series.current_count + 1;

        // Idempotency: check if we already generated this sequence in a prior partial run
        const { data: existing } = await supabase
          .from("invoices")
          .select("id")
          .eq("invoice_recurring_id", series.id)
          .eq("recurring_sequence", nextSequence)
          .maybeSingle();

        if (existing) {
          logger.log("Recurring invoice generator: sequence already exists, advancing series", {
            ...seriesLog,
            sequence: nextSequence,
            existingId: existing.id,
          });
          await advanceSeries(series, nextSequence);
          skipped++;
          continue;
        }

        // Calculate next dates
        const newIssueDate = addFrequency(series.source_issue_date, series.frequency as Frequency);
        const newDueDate = series.source_due_date
          ? addFrequency(series.source_due_date, series.frequency as Frequency)
          : null;

        // Get next invoice number via the Postgres RPC (same as web app, avoids races)
        const { data: newInvoiceNumber, error: numberError } = await supabase
          .rpc("next_invoice_number", {
            p_org_id: series.org_id,
            p_customer_id: series.customer_id,
          });

        if (numberError) {
          throw new Error(`Failed to get next invoice number: ${numberError.message}`);
        }

        const sentAt = new Date().toISOString();

        const { data: inserted, error: insertError } = await supabase
          .from("invoices")
          .insert({
            org_id: series.org_id,
            user_id: series.user_id,
            customer_id: series.customer_id,
            customer_name: series.customer_name,
            currency: series.currency,
            recurring: series.frequency,
            invoice_number: newInvoiceNumber,
            issue_date: newIssueDate,
            due_date: newDueDate,
            line_items: series.line_items,
            subtotal: series.subtotal,
            tax_amount: series.tax_amount,
            discount: series.discount,
            total: series.total,
            payment_details: series.payment_details,
            note: series.note,
            accept_payments: series.accept_payments,
            invoice_template: series.invoice_template,
            from_details: series.from_details,
            customer_details: series.customer_details,
            status: "unpaid",
            sent_at: sentAt,
            delivery_type: "email",
            invoice_recurring_id: series.id,
            recurring_sequence: nextSequence,
          })
          .select("id")
          .single();

        if (insertError) {
          throw new Error(`Failed to insert invoice: ${insertError.message}`);
        }

        logger.log("Recurring invoice generator: inserted invoice", {
          ...seriesLog,
          newId: inserted.id,
          newInvoiceNumber,
          newIssueDate,
          sequence: nextSequence,
        });

        // Send the email (non-fatal — series still advances)
        const emailRes = await fetch(
          `${process.env.SUPABASE_URL}/functions/v1/send-invoice-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              "X-Worker-Secret": process.env.WORKER_SHARED_SECRET!,
            },
            body: JSON.stringify({ invoiceId: inserted.id }),
          }
        );

        if (!emailRes.ok) {
          const body = await emailRes.text().catch(() => "");
          logger.warn("Recurring invoice generator: email send failed (non-fatal)", {
            ...seriesLog,
            status: emailRes.status,
            body,
          });
        }

        await advanceSeries(series, nextSequence);
        processed++;
      } catch (err) {
        logger.error("Recurring invoice generator: error processing series", {
          ...seriesLog,
          error: String(err),
        });

        const newFailureCount = series.failure_count + 1;
        const shouldPause = newFailureCount >= MAX_FAILURES;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("invoice_recurring")
          .update({
            failure_count: newFailureCount,
            ...(shouldPause && { status: "paused" }),
            updated_at: new Date().toISOString(),
          })
          .eq("id", series.id);

        if (shouldPause) {
          logger.warn("Recurring invoice generator: auto-paused series after repeated failures", {
            ...seriesLog,
            failureCount: newFailureCount,
          });
        }
      }
    }

    logger.log("Recurring invoice generator: complete", {
      processed,
      skipped,
      total: dueSeries.length,
    });
    return { processed, skipped };
  },
});

async function advanceSeries(
  series: { id: string; source_issue_date: string; frequency: string; current_count: number },
  completedSequence: number
) {
  const nextIssueDate = addFrequency(series.source_issue_date, series.frequency as Frequency);
  const nextScheduledAt = new Date(nextIssueDate + "T00:00:00Z").toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("invoice_recurring")
    .update({
      current_count: completedSequence,
      failure_count: 0,
      next_scheduled_at: nextScheduledAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", series.id);
}
