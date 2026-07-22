import React from "react";
import { schedules, logger, retry, AbortTaskRunError } from "@trigger.dev/sdk";
import { render } from "@react-email/render";
import { supabase } from "../lib/supabase";
import { resend, FROM_EMAIL, hashEmail, isResendClientError, isUnsubscribed } from "../lib/resend";
import { buildUnsubscribeUrl } from "../lib/unsubscribe";
import InactiveNudgeEmail from "../emails/inactive-nudge";

// Matches the reply-to used elsewhere in the lifecycle sequence.
const REPLY_TO = ["curtis.aliwah@travadasys.com", "nate.muliro@travadasys.com"];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const inactiveNudge = schedules.task({
  id: "inactive-nudge",
  // 6 AM UTC = 9 AM EAT — business-hours delivery for Nairobi
  cron: "0 6 * * *",
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
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId) {
      logger.warn("inactive-nudge: RESEND_AUDIENCE_ID not set, skipping");
      return { skipped: "no_audience" as const };
    }

    logger.log("Inactive nudge: starting");

    const now = new Date();
    // Bounded trailing window: signed up between 14 and 7 days ago. This keeps the
    // query cheap and self-expiring — a user ages out of consideration after day 14
    // whether or not they were ever flagged, so we never rescan the entire historical
    // user base every day (mirrors the lookback-window reasoning in invoice-reminders.ts).
    const earliest = new Date(now.getTime() - 14 * MS_PER_DAY).toISOString();
    const latest = new Date(now.getTime() - 7 * MS_PER_DAY).toISOString();

    const { data: candidates, error: candError } = await supabase
      .from("users")
      .select("id, email, full_name, active_org_id")
      .gte("created_at", earliest)
      .lte("created_at", latest)
      .is("inactive_nudge_sent_at", null)
      .not("active_org_id", "is", null);

    if (candError) {
      throw new Error(`Failed to query candidate users: ${candError.message}`);
    }
    if (!candidates?.length) {
      logger.log("Inactive nudge: no candidates");
      return { sent: 0 };
    }

    let totalSent = 0;

    for (const user of candidates) {
      const orgId = user.active_org_id as string;
      const emailHash = user.email ? hashEmail(user.email) : "unknown";

      try {
        // Activity signal: any invoice, quote, or transaction under the user's org.
        // Existence checks only (.limit(1)) — we don't need totals, just a yes/no.
        const [{ data: invoiceRow }, { data: quoteRow }, { data: txRow }] = await Promise.all([
          supabase.from("invoices").select("id").eq("org_id", orgId).limit(1),
          supabase.from("quotes").select("id").eq("org_id", orgId).limit(1),
          supabase.from("transactions").select("id").eq("org_id", orgId).limit(1),
        ]);

        if ((invoiceRow?.length ?? 0) > 0 || (quoteRow?.length ?? 0) > 0 || (txRow?.length ?? 0) > 0) {
          // User has activity — leave inactive_nudge_sent_at untouched, they'll simply
          // age out of the window in a few days. No need to stamp active users.
          continue;
        }

        if (!user.email) {
          logger.warn("inactive-nudge: user has no email, skipping", { userId: user.id });
          continue;
        }

        if (await isUnsubscribed(audienceId, user.email, emailHash)) {
          // Stamp so we stop rechecking this contact, but don't send.
          const { error: stampError } = await supabase
            .from("users")
            .update({ inactive_nudge_sent_at: new Date().toISOString() })
            .is("inactive_nudge_sent_at", null)
            .eq("id", user.id)
            .select("id");

          if (stampError) {
            logger.error("inactive-nudge: failed to stamp unsubscribed user", {
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
          .update({ inactive_nudge_sent_at: new Date().toISOString() })
          .is("inactive_nudge_sent_at", null)
          .eq("id", user.id)
          .select("id");

        if (stampError) {
          logger.error("inactive-nudge: failed to stamp inactive_nudge_sent_at", {
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
                React.createElement(InactiveNudgeEmail, {
                  firstName,
                  unsubscribeUrl,
                })
              );

              const { error } = await resend.emails.send({
                from: `Travada Books <${FROM_EMAIL}>`,
                to: [user.email as string],
                replyTo: REPLY_TO,
                subject: "Still there? Pick up where you left off",
                html,
                headers: {
                  "List-Unsubscribe": `<${unsubscribeUrl}>`,
                  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
              });

              if (error) {
                logger.warn("inactive-nudge: resend error", {
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
          logger.log("inactive-nudge: sent", { emailHash });
        } catch (err) {
          // Exhausted retry (or aborted client error) must never abort the whole run —
          // the user is already claimed, so log and move on to the next candidate.
          logger.error("inactive-nudge: send failed, continuing", {
            emailHash,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } catch (err) {
        logger.error("inactive-nudge: unexpected error processing user", {
          userId: user.id,
          error: String(err),
        });
      }
    }

    logger.log("Inactive nudge: complete", { sent: totalSent });
    return { sent: totalSent };
  },
});
