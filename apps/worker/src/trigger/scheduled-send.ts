import { schemaTask, wait, logger, AbortTaskRunError } from "@trigger.dev/sdk";
import { z } from "zod";
import React from "react";
import { render } from "@react-email/render";
import { Resend } from "resend";
import { supabase } from "../lib/supabase";
import { InvoiceSentEmail } from "../emails/invoice-sent";

const FROM_EMAIL = "noreply@mail.travadasys.com";
const APP_URL = "https://books.travadasys.com";

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

    logger.log("Scheduled send: waiting until send time", { invoiceId, scheduledAt });

    await wait.until({ date: new Date(scheduledAt) });

    logger.log("Scheduled send: wait complete, fetching invoice", { invoiceId });

    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("id, status, scheduled_at, currency, org_id, total, invoice_number, issue_date, due_date, token, from_details, customer_details, payment_details, note")
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

    const from = invoice.from_details as Record<string, string> | null;
    const customer = invoice.customer_details as Record<string, string> | null;

    if (!from || !customer) {
      throw new AbortTaskRunError(`Invoice ${invoiceId} is missing from_details or customer_details — cannot send`);
    }

    const recipientEmail = customer.billing_email || customer.email;
    if (!recipientEmail) {
      throw new AbortTaskRunError(`Invoice ${invoiceId} customer has no email address`);
    }

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

    logger.log("Scheduled send: sending email via Resend", { invoiceId, recipientEmail });

    const publicUrl = invoice.token ? `${APP_URL}/i/${invoice.token}` : APP_URL;

    const html = await render(
      React.createElement(InvoiceSentEmail, {
        orgName: from.name,
        orgLogoUrl: from.logo_url ?? null,
        orgEmail: from.email,
        customerName: customer.name,
        invoiceNumber: invoice.invoice_number,
        dueDate: invoice.due_date,
        total: invoice.total,
        currency: invoice.currency,
        publicUrl,
      })
    );

    const subject = `Invoice${invoice.invoice_number ? ` ${invoice.invoice_number}` : ""} from ${from.name}`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: emailError } = await resend.emails.send({
      from: `${from.name} <${FROM_EMAIL}>`,
      to: [recipientEmail],
      replyTo: from.email,
      subject,
      html,
    });

    if (emailError) {
      throw new Error(`Resend error for invoice ${invoiceId}: ${(emailError as { message: string }).message}`);
    }

    logger.log("Scheduled send: email sent, updating invoice to unpaid", { invoiceId });

    const now = new Date().toISOString();
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
      logger.log("Scheduled send: invoice was cancelled between send and update", { invoiceId });
      return { skipped: true, reason: "cancelled_during_transition" };
    }

    logger.log("Scheduled send: complete", { invoiceId });
    return { sent: true, invoiceId };
  },
});
