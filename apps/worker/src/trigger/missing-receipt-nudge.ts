import React from "react";
import { task, logger, retry, AbortTaskRunError } from "@trigger.dev/sdk";
import { render } from "@react-email/render";
import { supabase } from "../lib/supabase";
import { resend, FROM_EMAIL, hashEmail, isResendClientError, isUnsubscribed } from "../lib/resend";
import { buildUnsubscribeUrl } from "../lib/unsubscribe";
import { captureServerEvent } from "../lib/posthog";
import { findOrgsWithMissingReceipts, buildMissingReceiptsUrl, inboxAddress, SHOWN_LIMIT } from "../lib/missing-receipts";
import MissingReceiptsEmail, { missingReceiptsSubject } from "../emails/missing-receipts";

// Same reply-to as inactive-nudge.ts (owner is changing it later).
const REPLY_TO = ["curtis.aliwah@travadabooks.com"];
const APP_URL = process.env.APP_URL ?? "https://app.travadabooks.com";
const NOTIFICATION_TYPE = "transactions.missing_receipts";
// organization_members.role only allows owner|member today; admin is listed so
// it works if that role is ever added.
const RECIPIENT_ROLES = ["owner", "admin"];

// Plain task, not schedules.task: the plan is at its 10-schedule limit.
// Triggered by daily-status-sweep on Thursdays (UTC) with a delay to ~06:00 UTC
// (Monday belongs to the weekly insight). weekOf is that day's date, so the
// Resend key below is still one send per week.
export const missingReceiptNudge = task({
  id: "missing-receipt-nudge",
  maxDuration: 900,
  queue: { concurrencyLimit: 1 },
  retry: { maxAttempts: 3, minTimeoutInMs: 1000, maxTimeoutInMs: 10000, factor: 2, randomize: true },
  run: async (payload: { weekOf?: string } = {}) => {
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId) {
      logger.warn("missing-receipt-nudge: RESEND_AUDIENCE_ID not set, skipping");
      return { skipped: "no_audience" as const };
    }

    const weekOf = payload.weekOf ?? new Date().toISOString().slice(0, 10);
    const orgs = await findOrgsWithMissingReceipts(supabase);
    logger.log("missing-receipt-nudge: orgs to nudge", { orgs: orgs.length, weekOf });

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const org of orgs) {
      try {
        const { data: orgRow, error: orgErr } = await supabase
          .from("organizations")
          .select("name, logo_url, inbox_id")
          .eq("id", org.orgId)
          .single();
        if (orgErr || !orgRow) throw new Error(`org lookup failed: ${orgErr?.message}`);

        const { data: members, error: memErr } = await supabase
          .from("organization_members")
          .select("user_id")
          .eq("org_id", org.orgId)
          .eq("status", "active")
          .not("user_id", "is", null)
          .in("role", RECIPIENT_ROLES);
        if (memErr) throw new Error(`members lookup failed: ${memErr.message}`);
        const userIds = [...new Set((members ?? []).map((m) => m.user_id as string))];
        if (!userIds.length) continue;

        const [{ data: users, error: userErr }, { data: prefs, error: prefErr }] = await Promise.all([
          supabase.from("users").select("id, email, full_name").in("id", userIds),
          supabase
            .from("notification_settings")
            .select("user_id")
            .eq("org_id", org.orgId)
            .eq("notification_type", NOTIFICATION_TYPE)
            .eq("channel", "email")
            .eq("enabled", false)
            .in("user_id", userIds),
        ]);
        if (userErr) throw new Error(`users lookup failed: ${userErr.message}`);
        // On a prefs read failure skip the org rather than nudge someone who opted out.
        if (prefErr) throw new Error(`notification_settings lookup failed: ${prefErr.message}`);
        const disabled = new Set((prefs ?? []).map((p) => p.user_id as string));

        for (const user of users ?? []) {
          try {
            if (!user.email) continue;
            const email = user.email as string;
            const emailHash = hashEmail(email);

            if (disabled.has(user.id as string)) {
              skipped++;
              await captureServerEvent(user.id as string, "receipt_nudge_skipped", { org_id: org.orgId, reason: "disabled" });
              continue;
            }
            if (await isUnsubscribed(audienceId, email, emailHash)) {
              skipped++;
              await captureServerEvent(user.id as string, "receipt_nudge_skipped", { org_id: org.orgId, reason: "unsubscribed" });
              continue;
            }

            const firstName = (user.full_name as string | null)?.split(" ")[0];

            try {
              await retry.onThrow(
                async ({ attempt }) => {
                  const unsubscribeUrl = buildUnsubscribeUrl(email);
                  const html = await render(
                    React.createElement(MissingReceiptsEmail, {
                      firstName,
                      orgName: orgRow.name as string,
                      orgLogoUrl: orgRow.logo_url as string | null,
                      missingCount: org.missingCount,
                      rows: org.shown,
                      inboxAddress: inboxAddress(orgRow.inbox_id as string | null),
                      url: buildMissingReceiptsUrl(APP_URL),
                      unsubscribeUrl,
                    }),
                  );

                  const { error } = await resend.emails.send(
                    {
                      from: `Travada Books <${FROM_EMAIL}>`,
                      to: [email],
                      replyTo: REPLY_TO,
                      subject: missingReceiptsSubject(org.missingCount),
                      html,
                      headers: {
                        "List-Unsubscribe": `<${unsubscribeUrl}>`,
                        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                      },
                    },
                    { idempotencyKey: `missing-receipts/${org.orgId}/${user.id}/${weekOf}` },
                  );

                  if (error) {
                    logger.warn("missing-receipt-nudge: resend error", { emailHash, attempt, error });
                    if (isResendClientError(error.name)) throw new AbortTaskRunError(error.message);
                    throw new Error(error.message);
                  }
                },
                { maxAttempts: 3, minTimeoutInMs: 2000, factor: 2, randomize: true },
              );

              sent++;
              logger.log("missing-receipt-nudge: sent", { emailHash });
              await captureServerEvent(user.id as string, "receipt_nudge_sent", {
                org_id: org.orgId,
                missing_count: org.missingCount,
                shown_count: Math.min(org.shown.length, SHOWN_LIMIT),
                new_this_week: org.newThisWeek,
              });
            } catch (err) {
              failed++;
              logger.error("missing-receipt-nudge: send failed, continuing", {
                emailHash,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          } catch (err) {
            failed++;
            logger.error("missing-receipt-nudge: unexpected error processing user", { userId: user.id, error: String(err) });
          }
        }
      } catch (err) {
        failed++;
        logger.error("missing-receipt-nudge: org failed, continuing", { orgId: org.orgId, error: String(err) });
      }
    }

    logger.log("missing-receipt-nudge: complete", { sent, skipped, failed });
    return { orgs: orgs.length, sent, skipped, failed };
  },
});
