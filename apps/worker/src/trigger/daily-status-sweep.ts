import { schedules, idempotencyKeys, logger } from "@trigger.dev/sdk";
import { markOverdue } from "./mark-overdue";
import { quoteExpire } from "./quote-expire";
import { missingReceiptNudge } from "./missing-receipt-nudge";
import { weeklyInsights } from "./weekly-insights";
import { lastCompletedWeekStart } from "../lib/insights/metrics";

// One schedule for the 1 AM status sweeps (the plan allows 10 schedules, all used).
// On Mondays (UTC) it also queues the weekly insights; on Thursdays the missing-receipts
// nudge (kept off Monday so people do not get two emails the same day).
// Each child keeps its own run, retries and logs; a failure in one never
// blocks the other. Keys are scoped to this run, so a retry won't re-trigger.
export const dailyStatusSweep = schedules.task({
  id: "daily-status-sweep",
  // 1 AM UTC = 4 AM EAT — runs after midnight Nairobi time
  cron: "0 1 * * *",
  run: async (payload) => {
    // Weekday in UTC, from the scheduled time so a retry after midnight can't flip the day.
    const dow = payload.timestamp.getUTCDay();
    const isMonday = dow === 1;
    const isThursday = dow === 4;
    // weekOf is the Thursday's date: one per week, so the nudge's Resend key stays once-a-week.
    const weekOf = payload.timestamp.toISOString().slice(0, 10);
    // Nudge should land ~06:00 UTC (9am Nairobi); skip the delay if we're already past it.
    const sendAt = new Date(`${weekOf}T06:00:00.000Z`);
    const delay = sendAt.getTime() > Date.now() ? sendAt : undefined;
    // Insights land ~05:30 UTC, for the week that ended yesterday.
    const insightsAt = new Date(`${weekOf}T05:30:00.000Z`);
    const insightsDelay = insightsAt.getTime() > Date.now() ? insightsAt : undefined;

    // Attempt all before failing, so one rejected trigger can't skip the
    // other; the throw then retries the sweep and the keys dedupe the one
    // that already went through.
    const [overdue, expire, nudge, insights] = await Promise.allSettled([
      idempotencyKeys.create("mark-overdue").then((idempotencyKey) => markOverdue.trigger(undefined, { idempotencyKey })),
      idempotencyKeys.create("quote-expire").then((idempotencyKey) => quoteExpire.trigger(undefined, { idempotencyKey })),
      isThursday
        ? idempotencyKeys
            .create("missing-receipt-nudge")
            .then((idempotencyKey) => missingReceiptNudge.trigger({ weekOf }, { idempotencyKey, delay }))
        : Promise.resolve(null),
      isMonday
        ? idempotencyKeys
            .create("weekly-insights")
            .then((idempotencyKey) =>
              weeklyInsights.trigger({ weekStart: lastCompletedWeekStart(payload.timestamp) }, { idempotencyKey, delay: insightsDelay }),
            )
        : Promise.resolve(null),
    ]);
    const ids = {
      markOverdue: overdue.status === "fulfilled" ? overdue.value.id : null,
      quoteExpire: expire.status === "fulfilled" ? expire.value.id : null,
      missingReceiptNudge: nudge.status === "fulfilled" ? (nudge.value?.id ?? null) : null,
      weeklyInsights: insights.status === "fulfilled" ? (insights.value?.id ?? null) : null,
    };
    const failed: string[] = [];
    if (overdue.status === "rejected") failed.push(`mark-overdue: ${String(overdue.reason)}`);
    if (expire.status === "rejected") failed.push(`quote-expire: ${String(expire.reason)}`);
    if (insights.status === "rejected") failed.push(`weekly-insights: ${String(insights.reason)}`);
    if (nudge.status === "rejected") failed.push(`missing-receipt-nudge: ${String(nudge.reason)}`);
    if (failed.length) {
      logger.error("Daily status sweep: trigger failed", { ...ids, failed });
      throw new Error(`Failed to trigger ${failed.join("; ")}`);
    }
    logger.log("Daily status sweep: triggered", ids);
    return ids;
  },
});
