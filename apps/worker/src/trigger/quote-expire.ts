import { schedules, logger } from "@trigger.dev/sdk";
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
    // Use UTC tomorrow as a broad pre-filter: catches any org where "today"
    // has arrived in their local timezone (max UTC offset is UTC+14).
    const now = new Date();
    const tomorrowUtc = new Date(now);
    tomorrowUtc.setUTCDate(tomorrowUtc.getUTCDate() + 1);
    const tomorrowStr = tomorrowUtc.toISOString().split("T")[0];

    const { data: candidates, error: candError } = await supabase
      .from("quotes")
      .select("org_id")
      .eq("status", "sent")
      .lt("valid_until", tomorrowStr);

    if (candError) throw new Error(`Failed to query candidate orgs: ${candError.message}`);
    if (!candidates || candidates.length === 0) {
      logger.log("Quote expire: no candidates");
      return { expired: 0 };
    }

    const orgIds = [...new Set(candidates.map((q: { org_id: string }) => q.org_id))];
    logger.log("Quote expire: starting", { orgs: orgIds.length });

    let totalExpired = 0;

    for (const orgId of orgIds) {
      // Resolve the org owner's timezone so expiration uses the org-local calendar date.
      const { data: member } = await supabase
        .from("organization_members")
        .select("users(timezone)")
        .eq("org_id", orgId)
        .eq("role", "owner")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      const tz = (member?.users as { timezone?: string | null } | null)?.timezone ?? "UTC";
      // "en-CA" locale produces "YYYY-MM-DD" which matches the DB date column format.
      const localToday = now.toLocaleDateString("en-CA", { timeZone: tz });

      const { data, error } = await supabase
        .from("quotes")
        .update({ status: "expired" })
        .eq("org_id", orgId)
        .eq("status", "sent")
        .lt("valid_until", localToday)
        .select("id");

      if (error) {
        logger.error(`Quote expire: failed for org ${orgId}`, { error: error.message });
        continue;
      }

      totalExpired += data?.length ?? 0;
    }

    logger.log("Quote expire: complete", { expired: totalExpired });
    return { expired: totalExpired };
  },
});
