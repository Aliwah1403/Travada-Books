import React from "react";
import { task, logger, retry, AbortTaskRunError } from "@trigger.dev/sdk";
import { render } from "@react-email/render";
import { supabase } from "../lib/supabase";
import { resend, FROM_EMAIL, hashEmail, isResendClientError, isUnsubscribed } from "../lib/resend";
import { buildUnsubscribeUrl } from "../lib/unsubscribe";
import { TransactionsVaultAnnouncementEmail } from "../emails/transactions-vault-announcement";

// Matches the reply-to used elsewhere in the lifecycle sequence.
const REPLY_TO = ["curtis.aliwah@travadasys.com", "nate.muliro@travadasys.com"];

// One-off broadcast to existing customers about Transactions + Vault — not a schedule.
// Trigger manually once from the Trigger.dev dashboard ("Test" run) or a single REST call,
// same as `on-user-signup` does for welcome-sequence. Safe to re-run: every send is claimed
// via a conditional update on transactions_vault_announcement_sent_at, so already-sent users
// are skipped and a re-run only reaches stragglers.
export const transactionsVaultAnnouncement = task({
  id: "transactions-vault-announcement",
  maxDuration: 1800,
  queue: { concurrencyLimit: 1 },
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
    randomize: true,
  },
  run: async () => {
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId) {
      logger.warn("transactions-vault-announcement: RESEND_AUDIENCE_ID not set, skipping");
      return { skipped: "no_audience" as const };
    }

    logger.log("Transactions/Vault announcement: starting");

    const { data: candidates, error: candError } = await supabase
      .from("users")
      .select("id, email, full_name")
      .is("transactions_vault_announcement_sent_at", null)
      .not("active_org_id", "is", null);

    if (candError) {
      throw new Error(`Failed to query candidate users: ${candError.message}`);
    }
    if (!candidates?.length) {
      logger.log("Transactions/Vault announcement: no candidates");
      return { sent: 0 };
    }

    let totalSent = 0;

    for (const user of candidates) {
      const emailHash = user.email ? hashEmail(user.email) : "unknown";

      try {
        if (!user.email) {
          logger.warn("transactions-vault-announcement: user has no email, skipping", { userId: user.id });
          continue;
        }

        if (await isUnsubscribed(audienceId, user.email, emailHash)) {
          // Stamp so we stop rechecking this contact, but don't send.
          const { error: stampError } = await supabase
            .from("users")
            .update({ transactions_vault_announcement_sent_at: new Date().toISOString() })
            .is("transactions_vault_announcement_sent_at", null)
            .eq("id", user.id)
            .select("id");

          if (stampError) {
            logger.error("transactions-vault-announcement: failed to stamp unsubscribed user", {
              userId: user.id,
              error: stampError.message,
            });
          }
          continue;
        }

        // Atomically claim this user before sending. The .is() condition means only
        // one concurrent worker wins; 0 rows back = already claimed.
        const { data: stamped, error: stampError } = await supabase
          .from("users")
          .update({ transactions_vault_announcement_sent_at: new Date().toISOString() })
          .is("transactions_vault_announcement_sent_at", null)
          .eq("id", user.id)
          .select("id");

        if (stampError) {
          logger.error("transactions-vault-announcement: failed to stamp transactions_vault_announcement_sent_at", {
            userId: user.id,
            error: stampError.message,
          });
          continue;
        }
        if (!stamped || stamped.length === 0) {
          // Another worker already claimed this user — skip to avoid duplicate send.
          continue;
        }

        const firstName = user.full_name?.split(" ")[0];

        try {
          await retry.onThrow(
            async ({ attempt }) => {
              const unsubscribeUrl = buildUnsubscribeUrl(user.email as string);
              const html = await render(
                React.createElement(TransactionsVaultAnnouncementEmail, {
                  firstName,
                  unsubscribeUrl,
                })
              );

              const { error } = await resend.emails.send({
                from: `Travada Books <${FROM_EMAIL}>`,
                to: [user.email as string],
                replyTo: REPLY_TO,
                subject: "Two features already sitting in your account",
                html,
                headers: {
                  "List-Unsubscribe": `<${unsubscribeUrl}>`,
                  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
              });

              if (error) {
                logger.warn("transactions-vault-announcement: resend error", {
                  emailHash,
                  attempt,
                  error,
                });
                if (isResendClientError(error.name)) {
                  throw new AbortTaskRunError(error.message);
                }
                throw new Error(error.message);
              }
            },
            { maxAttempts: 3, minTimeoutInMs: 2000, factor: 2, randomize: true }
          );

          totalSent++;
          logger.log("transactions-vault-announcement: sent", { emailHash });
        } catch (err) {
          // Exhausted retry (or aborted client error) must never abort the whole run —
          // the user is already claimed, so log and move on to the next candidate.
          logger.error("transactions-vault-announcement: send failed, continuing", {
            emailHash,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } catch (err) {
        logger.error("transactions-vault-announcement: unexpected error processing user", {
          userId: user.id,
          error: String(err),
        });
      }
    }

    logger.log("Transactions/Vault announcement: complete", { sent: totalSent });
    return { sent: totalSent };
  },
});
