import { task } from "@trigger.dev/sdk";
import { getSupabase, matchInboxItem } from "../lib/inbox-matching-run";

// Inbox Batch 3b — the matching engine. Orchestration only; all scoring math
// lives in ../lib/inbox-matching.ts (pure, unit-testable) and the shared
// per-item run body lives in ../lib/inbox-matching-run.ts (also used by
// batch-match-inbox.ts for the reverse direction, Batch 3h). Triggered by
// process-inbox-attachment.ts with `{ inboxItemId }` once extraction + the
// merchant-identity embedding are written.

export const matchInboxTransactionsTask = task({
  id: "match-inbox-transactions",
  maxDuration: 60,
  retry: { maxAttempts: 2 },
  run: async (payload: { inboxItemId: string }) => {
    const supabase = getSupabase();
    return matchInboxItem(supabase, payload.inboxItemId);
  },
});
