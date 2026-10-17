import { schedules, logger } from "@trigger.dev/sdk";

// Re-verifies Paystack payment attempts that never got a webhook (or whose
// M-Pesa prompt was slow) and abandons attempts older than 48 h. The work
// happens in the payments-reverify edge function, which is gated by
// X-Worker-Secret. Every 15 minutes, UTC.
export const paymentsReverify = schedules.task({
  id: "payments-reverify",
  cron: "*/15 * * * *",
  maxDuration: 300,
  queue: { concurrencyLimit: 1 },
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
    randomize: true,
  },
  run: async () => {
    const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/payments-reverify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "X-Worker-Secret": process.env.WORKER_SHARED_SECRET!,
      },
      body: JSON.stringify({}),
    });

    // 503 = Paystack key not configured on this environment yet; nothing to do.
    if (res.status === 503) {
      logger.log("payments-reverify: payments not configured, skipping");
      return { skipped: true };
    }

    const body = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(`payments-reverify failed: ${res.status} ${body}`);
    }

    logger.log("payments-reverify: complete", { body });
    return { ok: true };
  },
});
