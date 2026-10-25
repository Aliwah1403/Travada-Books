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
    const overdue = await markOverdue.trigger(undefined, {
      idempotencyKey: await idempotencyKeys.create("mark-overdue"),
    });
    const expire = await quoteExpire.trigger(undefined, {
      idempotencyKey: await idempotencyKeys.create("quote-expire"),
    });
    logger.log("Daily status sweep: triggered", { markOverdue: overdue.id, quoteExpire: expire.id });
    return { markOverdue: overdue.id, quoteExpire: expire.id };
  },
});
