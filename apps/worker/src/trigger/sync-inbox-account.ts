import { task } from "@trigger.dev/sdk";
import { syncInboxAccount } from "../lib/inbox/sync-account";

export const syncInboxAccountTask = task({
  id: "sync-inbox-account",
  // Fewer retries than default — avoid hammering Gmail's API on quota/rate-
  // limit errors. Terminal outcomes (dead refresh token) are handled inside
  // syncInboxAccount itself and never reach the retry path.
  retry: { maxAttempts: 2 },
  run: async (payload: { inboxAccountId: string; fullSync?: boolean }) => {
    return syncInboxAccount(payload.inboxAccountId, { fullSync: payload.fullSync ?? false });
  },
});
