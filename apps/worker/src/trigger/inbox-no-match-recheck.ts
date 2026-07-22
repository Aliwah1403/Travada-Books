import { schedules, tasks, logger } from "@trigger.dev/sdk";
import { getSupabase } from "../lib/inbox-matching-run";
import type { batchMatchInboxTask } from "./batch-match-inbox";

// Inbox Batch 3h — daily sweep for the reverse-matching direction. Most
// no_match items get cleared the moment their transaction lands (via the
// batch-match-inbox trigger at the end of enrich-transactions.ts), but this
// catches anything that fell through: a transaction created before this
// feature existed, an embedding that failed and was retried later, etc.
// 06:00 UTC — off-peak for every timezone this product currently serves
// (Kenya/Gulf), well clear of business-hours import/webhook traffic.

// Bounds the fan-out so one scheduled run can't trigger unbounded child runs —
// orgs beyond this cap simply get picked up on the next day's run.
const MAX_ORGS_PER_RUN = 200;

export const inboxNoMatchRecheckTask = schedules.task({
  id: "inbox-no-match-recheck",
  cron: "0 6 * * *",
  run: async () => {
    const supabase = getSupabase();

    // Distinct orgs with at least one live no_match, unmatched inbox item.
    const { data, error } = await supabase
      .from("inbox_items")
      .select("org_id")
      .eq("status", "no_match")
      .is("transaction_id", null)
      .limit(5000);

    if (error) {
      throw new Error(`Failed to fetch orgs with no_match inbox items: ${error.message}`);
    }

    const orgIds = [...new Set((data ?? []).map((r) => r.org_id as string))].slice(0, MAX_ORGS_PER_RUN);

    if (orgIds.length === 0) {
      logger.info("No orgs with no_match inbox items");
      return { orgsTriggered: 0 };
    }

    logger.info("Triggering batch-match-inbox for orgs with no_match items", { orgCount: orgIds.length });

    await tasks.batchTrigger<typeof batchMatchInboxTask>(
      "batch-match-inbox",
      orgIds.map((orgId) => ({
        payload: { orgId },
        // Same debounce key the enrichment trigger uses: if an import is
        // already rematching this org, the sweep folds into that run instead
        // of racing it over the same no_match items.
        options: { debounce: { key: `batch-match-inbox-${orgId}`, delay: "30s", mode: "trailing" as const } },
      })),
    );

    return { orgsTriggered: orgIds.length };
  },
});
