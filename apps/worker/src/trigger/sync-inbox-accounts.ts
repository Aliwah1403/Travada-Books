import { schedules, tasks, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import type { syncInboxAccountTask } from "./sync-inbox-account";

// Global sync cron — every 6 hours, UTC. Fans out one sync-inbox-account run
// per currently-connected mailbox. Individual account failures (transient
// Gmail errors, dead refresh tokens) are handled inside sync-inbox-account /
// syncInboxAccount and never bubble up to fail this scheduler run.
export const syncInboxAccountsTask = schedules.task({
  id: "sync-inbox-accounts",
  cron: "0 */6 * * *",
  run: async () => {
    const { data: accounts, error } = await supabase
      .from("inbox_accounts")
      .select("id")
      .eq("status", "connected");

    if (error) throw new Error(`Failed to load connected inbox accounts: ${error.message}`);
    if (!accounts || accounts.length === 0) {
      logger.log("sync-inbox-accounts: no connected accounts");
      return { triggered: 0 };
    }

    await tasks.batchTrigger<typeof syncInboxAccountTask>(
      "sync-inbox-account",
      accounts.map((a: { id: string }) => ({ payload: { inboxAccountId: a.id, fullSync: false } })),
    );

    logger.log("sync-inbox-accounts: triggered", { accounts: accounts.length });
    return { triggered: accounts.length };
  },
});
