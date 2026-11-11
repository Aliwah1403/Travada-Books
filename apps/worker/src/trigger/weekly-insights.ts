import React from "react";
import { task, logger, retry, idempotencyKeys, AbortTaskRunError } from "@trigger.dev/sdk";
import { render } from "@react-email/render";
import { supabase } from "../lib/supabase";
import { resend, FROM_EMAIL, hashEmail, isResendClientError, isUnsubscribed } from "../lib/resend";
import { buildUnsubscribeUrl } from "../lib/unsubscribe";
import { captureServerEvent } from "../lib/posthog";
import { addDays, computeWeeklyMetrics, lastCompletedWeekStart, type InsightActivity, type InsightMetrics } from "../lib/insights/metrics";
import { buildFigures, generateInsightContent, periodLabel, type InsightContent } from "../lib/insights/narrative";
import WeeklyInsightEmail, { weeklyInsightSubject } from "../emails/weekly-insight";

// Same reply-to as missing-receipt-nudge.ts (owner is changing it later).
const REPLY_TO = ["curtis.aliwah@travadabooks.com"];
const APP_URL = process.env.APP_URL ?? "https://app.travadabooks.com";
const NOTIFICATION_TYPE = "insights.weekly";
// organization_members.role only allows owner|member today; admin is listed so
// it works if that role is ever added.
const RECIPIENT_ROLES = ["owner", "admin"];

type SkipReason = "no_recent_activity" | "quiet_week" | "org_not_found";

function withFrom(href: string): string {
  return `${APP_URL}${href}${href.includes("?") ? "&" : "?"}from=weekly-insight`;
}

// Plain tasks, not schedules.task: the plan is at its 10-schedule limit.
// weekly-insights is started by daily-status-sweep on Mondays (UTC) with a delay to ~05:30 UTC.

export const generateOrgInsight = task({
  id: "generate-org-insight",
  maxDuration: 600,
  queue: { name: "weekly-insights", concurrencyLimit: 5 },
  retry: { maxAttempts: 3, minTimeoutInMs: 2000, maxTimeoutInMs: 20000, factor: 2, randomize: true },
  run: async (payload: { orgId: string; weekStart: string }) => {
    const { orgId, weekStart } = payload;
    const started = Date.now();

    // An existing row means a retry or a rerun: reuse it so the email matches
    // what the app shows and the AI is not called twice.
    const { data: existing, error: existingErr } = await supabase
      .from("insights")
      .select("metrics, content, generated_by, period_end, currency")
      .eq("org_id", orgId)
      .eq("period_start", weekStart)
      .maybeSingle();
    if (existingErr) throw new Error(`insight lookup failed: ${existingErr.message}`);

    let metrics: InsightMetrics;
    let content: InsightContent;
    let periodEnd = addDays(weekStart, 6);
    let isFirst = false;
    let generatedBy: "ai" | "fallback";

    if (existing) {
      metrics = existing.metrics as InsightMetrics;
      content = existing.content as InsightContent;
      generatedBy = existing.generated_by as "ai" | "fallback";
      periodEnd = existing.period_end as string;
    } else {
      const result = await computeWeeklyMetrics(supabase, orgId, weekStart);
      if (!result.ok) {
        await captureServerEvent(orgId, "insight_skipped", { org_id: orgId, reason: result.reason as SkipReason });
        logger.log("generate-org-insight: skipped", { orgId, reason: result.reason });
        return { skipped: result.reason };
      }
      metrics = result.metrics;
      periodEnd = result.periodEnd;

      const { count, error: countErr } = await supabase
        .from("insights")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .lt("period_start", weekStart);
      if (countErr) throw new Error(`prior insights lookup failed: ${countErr.message}`);
      isFirst = (count ?? 0) === 0;

      const generated = await generateInsightContent(metrics, { isFirstInsight: isFirst });
      content = generated.content;
      generatedBy = generated.generatedBy;
      if (generated.rejectedReason) logger.warn("generate-org-insight: used fallback text", { orgId, reason: generated.rejectedReason });

      const { error: upsertErr } = await supabase.from("insights").upsert(
        {
          org_id: orgId,
          period_start: weekStart,
          period_end: periodEnd,
          currency: metrics.currency,
          metrics,
          activity: result.activity satisfies InsightActivity,
          content,
          generated_by: generatedBy,
        },
        { onConflict: "org_id,period_start" },
      );
      if (upsertErr) throw new Error(`insight upsert failed: ${upsertErr.message}`);

      await captureServerEvent(orgId, "insight_generated", { org_id: orgId, generated_by: generatedBy, duration_ms: Date.now() - started });
    }

    const emailed = await sendInsightEmails({ orgId, weekStart, periodEnd, metrics, content });
    return { generatedBy, ...emailed };
  },
});

async function sendInsightEmails(args: {
  orgId: string;
  weekStart: string;
  periodEnd: string;
  metrics: InsightMetrics;
  content: InsightContent;
}) {
  const { orgId, weekStart, periodEnd, metrics, content } = args;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    logger.warn("generate-org-insight: RESEND_AUDIENCE_ID not set, not emailing");
    return { sent: 0, skipped: 0, failed: 0 };
  }

  const { data: orgRow, error: orgErr } = await supabase.from("organizations").select("name, logo_url").eq("id", orgId).single();
  if (orgErr || !orgRow) throw new Error(`org lookup failed: ${orgErr?.message}`);

  const { data: members, error: memErr } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("status", "active")
    .not("user_id", "is", null)
    .in("role", RECIPIENT_ROLES);
  if (memErr) throw new Error(`members lookup failed: ${memErr.message}`);
  const userIds = [...new Set((members ?? []).map((m) => m.user_id as string))];
  if (!userIds.length) return { sent: 0, skipped: 0, failed: 0 };

  const [{ data: users, error: userErr }, { data: prefs, error: prefErr }] = await Promise.all([
    supabase.from("users").select("id, email, full_name").in("id", userIds),
    supabase
      .from("notification_settings")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("notification_type", NOTIFICATION_TYPE)
      .eq("channel", "email")
      .eq("enabled", false)
      .in("user_id", userIds),
  ]);
  if (userErr) throw new Error(`users lookup failed: ${userErr.message}`);
  // On a prefs read failure stop rather than email someone who opted out.
  if (prefErr) throw new Error(`notification_settings lookup failed: ${prefErr.message}`);
  const disabled = new Set((prefs ?? []).map((p) => p.user_id as string));

  // First insight = no earlier week stored; the figures then carry no comparison.
  const { count: priorCount } = await supabase
    .from("insights")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .lt("period_start", weekStart);
  const figures = buildFigures(metrics, (priorCount ?? 0) === 0);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users ?? []) {
    try {
      if (!user.email) continue;
      const email = user.email as string;
      const emailHash = hashEmail(email);
      if (disabled.has(user.id as string)) {
        skipped++;
        continue;
      }
      if (await isUnsubscribed(audienceId, email, emailHash)) {
        skipped++;
        continue;
      }
      const firstName = (user.full_name as string | null)?.split(" ")[0];

      try {
        await retry.onThrow(
          async ({ attempt }) => {
            const unsubscribeUrl = buildUnsubscribeUrl(email);
            const html = await render(
              React.createElement(WeeklyInsightEmail, {
                firstName,
                orgName: orgRow.name as string,
                orgLogoUrl: orgRow.logo_url as string | null,
                title: content.title,
                periodLabel: periodLabel(weekStart, periodEnd),
                summary: content.summary,
                figures,
                actions: content.actions.map((a) => ({ text: a.text, url: withFrom(a.href) })),
                url: withFrom("/insights"),
                unsubscribeUrl,
              }),
            );
            const { error } = await resend.emails.send(
              {
                from: `Travada Books <${FROM_EMAIL}>`,
                to: [email],
                replyTo: REPLY_TO,
                subject: weeklyInsightSubject(content.title),
                html,
                headers: {
                  "List-Unsubscribe": `<${unsubscribeUrl}>`,
                  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
              },
              { idempotencyKey: `weekly-insight/${orgId}/${user.id}/${weekStart}` },
            );
            if (error) {
              logger.warn("generate-org-insight: resend error", { emailHash, attempt, error });
              if (isResendClientError(error.name)) throw new AbortTaskRunError(error.message);
              throw new Error(error.message);
            }
          },
          { maxAttempts: 3, minTimeoutInMs: 2000, factor: 2, randomize: true },
        );
        sent++;
        await captureServerEvent(user.id as string, "insight_email_sent", { org_id: orgId });
      } catch (err) {
        failed++;
        logger.error("generate-org-insight: send failed, continuing", { emailHash, error: err instanceof Error ? err.message : String(err) });
      }
    } catch (err) {
      failed++;
      logger.error("generate-org-insight: unexpected error processing user", { userId: user.id, error: String(err) });
    }
  }
  return { sent, skipped, failed };
}

// Dispatcher. Only orgs with any transaction, invoice or quote activity in the
// last 4 weeks are queued (found by one SQL function, not by scanning every org).
export const weeklyInsights = task({
  id: "weekly-insights",
  maxDuration: 300,
  queue: { concurrencyLimit: 1 },
  retry: { maxAttempts: 3, minTimeoutInMs: 1000, maxTimeoutInMs: 10000, factor: 2, randomize: true },
  run: async (payload: { weekStart?: string } = {}) => {
    const weekStart = payload.weekStart ?? lastCompletedWeekStart();
    const weekEnd = addDays(weekStart, 6);
    const { data, error } = await supabase.rpc("orgs_with_recent_activity", {
      p_since: addDays(weekStart, -21),
      p_until: weekEnd,
    });
    if (error) throw new Error(`active orgs query failed: ${error.message}`);
    const orgIds = [...new Set(((data ?? []) as { org_id: string }[]).map((r) => r.org_id))];
    logger.log("weekly-insights: orgs to process", { orgs: orgIds.length, weekStart });
    if (!orgIds.length) return { orgs: 0, weekStart };

    // 1000 is the batch ceiling; chunk so a very large customer base still works.
    let queued = 0;
    for (let i = 0; i < orgIds.length; i += 500) {
      const chunk = orgIds.slice(i, i + 500);
      const items = await Promise.all(
        chunk.map(async (orgId) => ({
          payload: { orgId, weekStart },
          options: { idempotencyKey: await idempotencyKeys.create(["weekly-insight", orgId, weekStart], { scope: "global" }), idempotencyKeyTTL: "7d" },
        })),
      );
      await generateOrgInsight.batchTrigger(items);
      queued += items.length;
    }
    return { orgs: queued, weekStart };
  },
});
