import { schedules, logger } from "@trigger.dev/sdk";
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
    const now = new Date();
    // UTC tomorrow as a broad pre-filter: catches any org where today has
    // arrived locally (max UTC offset is +14).
    const tomorrowUtc = new Date(now);
    tomorrowUtc.setUTCDate(tomorrowUtc.getUTCDate() + 1);
    const tomorrowStr = tomorrowUtc.toISOString().split("T")[0];

    const { data: candidates, error: candError } = await supabase
      .from("invoices")
      .select("org_id")
      .eq("status", "unpaid")
      .lt("due_date", tomorrowStr);

    if (candError) throw new Error(`Failed to query candidate orgs: ${candError.message}`);
    if (!candidates || candidates.length === 0) {
      logger.log("Mark overdue: no candidates");
      return { updated: 0 };
    }

    const orgIds = [...new Set(candidates.map((r: { org_id: string }) => r.org_id))];
    logger.log("Mark overdue: starting", { orgs: orgIds.length });

    let totalUpdated = 0;

    for (const orgId of orgIds) {
      const { data: member } = await supabase
        .from("organization_members")
        .select("users(timezone)")
        .eq("org_id", orgId)
        .eq("role", "owner")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      const tz = (member?.users as { timezone?: string | null } | null)?.timezone ?? "UTC";
      // "en-CA" locale produces "YYYY-MM-DD" matching the DB date column format.
      const localToday = now.toLocaleDateString("en-CA", { timeZone: tz });

      const { data, error } = await supabase
        .from("invoices")
        .update({ status: "overdue" })
        .eq("org_id", orgId)
        .eq("status", "unpaid")
        .lt("due_date", localToday)
        .select("id");

      if (error) {
        logger.error(`Mark overdue: failed for org ${orgId}`, { error: error.message });
        continue;
      }

      totalUpdated += data?.length ?? 0;
    }

    logger.log("Mark overdue: complete", { updated: totalUpdated });
    return { updated: totalUpdated };
  },
});
