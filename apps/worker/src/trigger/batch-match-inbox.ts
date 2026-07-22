import { task, logger } from "@trigger.dev/sdk";
import { getSupabase, matchInboxItem } from "../lib/inbox-matching-run";

// Inbox Batch 3h — the reverse direction of matching. match-inbox-transactions
// only runs when an inbox item arrives; but receipts routinely arrive BEFORE
// their transaction does (photograph a receipt Monday, the bank/M-Pesa
// transaction lands Wednesday), so a newly-created transaction must also be
// matched back against inbox items still sitting in `no_match`. Triggered
// from the end of enrich-transactions.ts (after transaction_embeddings are
// written — matching is embedding-driven, so running any earlier would find
// nothing to match against) and from inbox-no-match-recheck.ts (the daily
// scheduled sweep).
//
// `transactionIds` is informational only (why this run fired) — matchInboxItem
// re-runs the full candidate search per inbox item rather than being scoped to
// specific transaction ids, so the newly-created transactions are picked up
// the same way any other candidate would be.

// Cap per run so one org with a huge no_match backlog can't dominate a single
// task execution (or blow maxDuration) — the daily recheck sweeps the rest.
const MAX_ITEMS_PER_RUN = 100;

export const batchMatchInboxTask = task({
  id: "batch-match-inbox",
  maxDuration: 300,
  retry: { maxAttempts: 2 },
  // Both trigger sites debounce on `batch-match-inbox-${orgId}`, so runs for a
  // single org never overlap; this cap just bounds the fan-out when the daily
  // sweep enqueues many orgs at once.
  queue: { concurrencyLimit: 10 },
  run: async (payload: { orgId: string; transactionIds?: string[] }) => {
    const { orgId, transactionIds } = payload;
    const supabase = getSupabase();

    const { data: items, error } = await supabase
      .from("inbox_items")
      .select("id")
      .eq("org_id", orgId)
      .eq("status", "no_match")
      .is("transaction_id", null)
      .order("created_at", { ascending: false })
      .limit(MAX_ITEMS_PER_RUN);

    if (error) {
      throw new Error(`Failed to fetch no_match inbox items: ${error.message}`);
    }

    if (!items || items.length === 0) {
      logger.info("No no_match inbox items to recheck", { orgId });
      return { checked: 0, matched: 0, suggested: 0, failed: 0 };
    }

    logger.info("Batch rechecking no_match inbox items", {
      orgId,
      count: items.length,
      triggeredByTransactionCount: transactionIds?.length ?? 0,
    });

    let matched = 0;
    let suggested = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const result = await matchInboxItem(supabase, item.id);
        if ("matched" in result && result.matched) {
          matched++;
        } else if ("tier" in result && result.tier !== "none") {
          suggested++;
        }
      } catch (err) {
        // Isolated per item — one bad row (missing data, transient RPC error)
        // must not fail the whole batch and strand every other item.
        failed++;
        logger.error("Failed to rematch inbox item", { inboxItemId: item.id, error: String(err) });
      }
    }

    logger.info("Batch recheck complete", { orgId, checked: items.length, matched, suggested, failed });
    return { checked: items.length, matched, suggested, failed };
  },
});
