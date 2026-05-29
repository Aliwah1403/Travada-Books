import { schedules, logger } from "@trigger.dev/sdk/v3";
import { supabase } from "../lib/supabase";

export const quoteExpire = schedules.task({
  id: "quote-expire",
  // Runs alongside mark-overdue at 1 AM UTC
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

    logger.log("Quote expire: starting", { today });

    const { data, error } = await supabase
      .from("quotes")
      .update({ status: "expired" })
      .eq("status", "sent")
      .lt("valid_until", today)
      .select("id");

    if (error) {
      throw new Error(`Failed to expire quotes: ${error.message}`);
    }

    const expired = data?.length ?? 0;
    logger.log("Quote expire: complete", { expired });
    return { expired };
  },
});
