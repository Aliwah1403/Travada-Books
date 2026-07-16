import { logger } from "@trigger.dev/sdk";

// Inbox Phase 6 — fires the notify-inbox edge function for a terminal
// inbox-matching outcome (auto-match, cross-currency match, or suggestions
// written). Same fetch+headers pattern as recurring-invoice-generator.ts's
// calls to send-invoice-email / notify-recurring-paused: worker identifies
// itself with both the service-role bearer token and X-Worker-Secret.
//
// Deliberately swallows every failure (bad response, network error, missing
// env vars) — a Novu/edge-function hiccup must never fail matchInboxItem,
// which has already durably written its match/suggestion outcome to the DB
// by the time this is called.
export type InboxNotificationEvent =
  | "inbox.new"
  | "inbox.auto_matched"
  | "inbox.needs_review"
  | "inbox.cross_currency_matched"
  | "inbox.match_confirmed";

export async function notifyInbox(
  event: InboxNotificationEvent,
  orgId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/notify-inbox`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "X-Worker-Secret": process.env.WORKER_SHARED_SECRET!,
      },
      body: JSON.stringify({ event, orgId, ...payload }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.warn("notifyInbox: notify-inbox call failed (non-fatal)", { event, orgId, status: res.status, body });
    }
  } catch (err) {
    logger.warn("notifyInbox: notify-inbox call threw (non-fatal)", { event, orgId, error: String(err) });
  }
}
