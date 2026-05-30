import { schedules, logger } from "@trigger.dev/sdk/v3";
import { supabase } from "../lib/supabase";

export const markOverdue = schedules.task({
  id: "mark-overdue",
  // 1 AM UTC = 4 AM EAT — runs after midnight Nairobi time
  cron: "0 1 * * *",
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
    const today = new Date().toISOString().split("T")[0];

    logger.log("Mark overdue: starting", { today });

    const { data, error } = await supabase
      .from("invoices")
      .update({ status: "overdue" })
      .eq("status", "unpaid")
      .lt("due_date", today)
      .select("id");

    if (error) {
      throw new Error(`Failed to mark invoices overdue: ${error.message}`);
    }

    const updated = data?.length ?? 0;
    logger.log("Mark overdue: complete", { updated });
    return { updated };
  },
});
