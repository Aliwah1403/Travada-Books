import { schedules, idempotencyKeys, logger } from "@trigger.dev/sdk";
import { markOverdue } from "./mark-overdue";
import { quoteExpire } from "./quote-expire";

// One schedule for both 1 AM status sweeps (the plan allows 10 schedules).
// Each child keeps its own run, retries and logs; a failure in one never
// blocks the other. Keys are scoped to this run, so a retry won't re-trigger.
export const dailyStatusSweep = schedules.task({
  id: "daily-status-sweep",
  // 1 AM UTC = 4 AM EAT — runs after midnight Nairobi time
  cron: "0 1 * * *",
  run: async () => {
    // Attempt both before failing, so one rejected trigger can't skip the
    // other; the throw then retries the sweep and the keys dedupe the one
    // that already went through.
    const [overdue, expire] = await Promise.allSettled([
      idempotencyKeys.create("mark-overdue").then((idempotencyKey) => markOverdue.trigger(undefined, { idempotencyKey })),
      idempotencyKeys.create("quote-expire").then((idempotencyKey) => quoteExpire.trigger(undefined, { idempotencyKey })),
    ]);
    const ids = {
      markOverdue: overdue.status === "fulfilled" ? overdue.value.id : null,
      quoteExpire: expire.status === "fulfilled" ? expire.value.id : null,
    };
    const failed: string[] = [];
    if (overdue.status === "rejected") failed.push(`mark-overdue: ${String(overdue.reason)}`);
    if (expire.status === "rejected") failed.push(`quote-expire: ${String(expire.reason)}`);
    if (failed.length) {
      logger.error("Daily status sweep: trigger failed", { ...ids, failed });
      throw new Error(`Failed to trigger ${failed.join("; ")}`);
    }
    logger.log("Daily status sweep: triggered", ids);
    return ids;
  },
});
