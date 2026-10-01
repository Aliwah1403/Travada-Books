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
    const expiredIds: string[] = [];

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
      if (data?.length) expiredIds.push(...data.map((q: { id: string }) => q.id));
    }

    // Notify business owners about newly-expired quotes. Non-fatal: never
    // let this throw — quotes are already marked expired by this point.
    // Chunk to stay well under any request-size limit for the ids array.
    const CHUNK_SIZE = 200;
    for (let i = 0; i < expiredIds.length; i += CHUNK_SIZE) {
      const chunk = expiredIds.slice(i, i + CHUNK_SIZE);
      try {
        const notifyRes = await fetch(
          `${process.env.SUPABASE_URL}/functions/v1/notify-quote-expired`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              "X-Worker-Secret": process.env.WORKER_SHARED_SECRET!,
            },
            body: JSON.stringify({ quoteIds: chunk }),
          }
        );

        if (!notifyRes.ok) {
          const body = await notifyRes.text().catch(() => "");
          logger.warn("Quote expire: expiry notification failed (non-fatal)", {
            status: notifyRes.status,
            body,
          });
        }
      } catch (notifyErr) {
        logger.warn("Quote expire: expiry notification threw (non-fatal)", {
          error: String(notifyErr),
        });
      }
    }

    logger.log("Quote expire: complete", { expired: totalExpired });
    return { expired: totalExpired };
  },
});
