import { db } from "./db.ts"
import { triggerNovu } from "./novu.ts"
import { shouldSend } from "./notification-prefs.ts"

const APP_URL = Deno.env.get("APP_URL") ?? "https://books.travadasys.com"

export type InboxEvent =
  | "inbox.new"
  | "inbox.auto_matched"
  | "inbox.needs_review"
  | "inbox.cross_currency_matched"
  | "inbox.match_confirmed"

const WORKFLOW_BY_EVENT: Record<InboxEvent, string> = {
  "inbox.new": "inbox-new",
  "inbox.auto_matched": "inbox-auto-matched",
  "inbox.needs_review": "inbox-needs-review",
  "inbox.cross_currency_matched": "inbox-cross-currency-matched",
  "inbox.match_confirmed": "inbox-match-confirmed",
}

export const INBOX_EVENTS: InboxEvent[] = Object.keys(WORKFLOW_BY_EVENT) as InboxEvent[]

type UserFields = { email: string } | null

/**
 * Fan out an inbox event to every active member of orgId, gated per-member by
 * their in_app notification preference. In-app only — no email channel for
 * any inbox event (notification_type IS the event string, e.g.
 * "inbox.auto_matched", so no separate mapping table is needed).
 *
 * Shared by notify-inbox/index.ts (the dual-auth entrypoint the worker and
 * web call) and inbox-webhook/index.ts (which calls this directly in-process
 * for inbox.new on inbound email, to avoid a self-fetch back into
 * notify-inbox).
 */
export async function fanOutInboxNotification(
  event: InboxEvent,
  orgId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const workflowId = WORKFLOW_BY_EVENT[event]
  if (!workflowId) return

  const inboxId = typeof payload.inboxId === "string" ? payload.inboxId : null
  const viewUrl = inboxId ? `${APP_URL}/inbox?inboxId=${inboxId}` : `${APP_URL}/inbox`

  const { data: members, error } = await db
    .from("organization_members")
    .select("user_id, users(email)")
    .eq("org_id", orgId)
    .eq("status", "active")

  if (error) {
    console.error(`fanOutInboxNotification: member lookup failed for org ${orgId}:`, error.message)
    return
  }
  if (!members || members.length === 0) return

  const novuPayload = { ...payload, viewUrl }

  for (const member of members) {
    const email = (member.users as unknown as UserFields)?.email
    if (!email) continue

    const canSend = await shouldSend(member.user_id, orgId, event, "in_app")
    if (!canSend) continue

    triggerNovu(workflowId, { subscriberId: member.user_id, email }, novuPayload).catch((err) =>
      console.error(`fanOutInboxNotification: novu trigger failed for ${event}/${orgId}:`, err),
    )
  }
}
