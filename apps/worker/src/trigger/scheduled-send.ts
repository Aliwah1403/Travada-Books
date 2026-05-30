import { schemaTask, wait, logger, AbortTaskRunError } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { supabase } from "../lib/supabase";

export const scheduledSend = schemaTask({
  id: "scheduled-send",
  schema: z.object({
    invoiceId: z.string().uuid(),
    scheduledAt: z.string().datetime(),
  }),
  maxDuration: 60,
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async (payload) => {
    const { invoiceId, scheduledAt } = payload;

    logger.log("Scheduled send: waiting until send time", {
      invoiceId,
      scheduledAt,
    });

    await wait.until({ date: new Date(scheduledAt) });

    logger.log("Scheduled send: wait complete, checking invoice state", { invoiceId });

    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("id, status, scheduled_at, currency, org_id, total")
      .eq("id", invoiceId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to fetch invoice ${invoiceId}: ${fetchError.message}`);
    }

    if (!invoice) {
      logger.log("Scheduled send: invoice no longer exists, skipping", { invoiceId });
      return { skipped: true, reason: "invoice_not_found" };
    }

    if (invoice.status !== "scheduled" || !invoice.scheduled_at) {
      logger.log("Scheduled send: invoice cancelled or already sent, skipping", {
        invoiceId,
        status: invoice.status,
        scheduledAt: invoice.scheduled_at,
      });
      return { skipped: true, reason: "invoice_no_longer_scheduled" };
    }

    const now = new Date().toISOString();

    // Look up exchange rate at actual send time
    const { data: org } = await supabase
      .from("organizations")
      .select("base_currency")
      .eq("id", invoice.org_id)
      .single();
    const baseCurrency = org?.base_currency ?? null;
    let exchangeRate: number | null = null;
    let convertedAmount: number | null = null;
    if (baseCurrency) {
      if (invoice.currency === baseCurrency) {
        exchangeRate = 1;
      } else {
        const { data: rateRow } = await supabase
          .from("exchange_rates")
          .select("rate")
          .eq("base", invoice.currency)
          .eq("target", baseCurrency)
          .maybeSingle();
        exchangeRate = (rateRow?.rate as number) ?? null;
      }
      convertedAmount = exchangeRate != null ? (invoice.total ?? 0) * exchangeRate : null;
    }

    const { data: updated, error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "unpaid",
        sent_at: now,
        scheduled_at: null,
        exchange_rate: exchangeRate,
        converted_amount: convertedAmount,
        base_currency: baseCurrency,
      })
      .eq("id", invoiceId)
      .eq("status", "scheduled")
      .not("scheduled_at", "is", null)
      .select("id")
      .maybeSingle();

    if (updateError) {
      throw new Error(`Failed to update invoice ${invoiceId} to unpaid: ${updateError.message}`);
    }

    if (!updated) {
      logger.log("Scheduled send: invoice was cancelled between check and update, skipping", { invoiceId });
      return { skipped: true, reason: "cancelled_during_transition" };
    }

    logger.log("Scheduled send: invoice marked unpaid, calling send-invoice-email", { invoiceId });

    const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/send-invoice-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "X-Worker-Secret": process.env.WORKER_SHARED_SECRET!,
      },
      body: JSON.stringify({ invoiceId }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const msg = `send-invoice-email returned ${res.status} for invoice ${invoiceId}: ${body}`;
      if (res.status >= 400 && res.status < 500) {
        throw new AbortTaskRunError(msg);
      }
      throw new Error(msg);
    }

    logger.log("Scheduled send: complete", { invoiceId });
    return { sent: true, invoiceId };
  },
});
