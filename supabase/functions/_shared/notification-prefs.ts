import { db } from "./db.ts"

export async function shouldSend(
  userId: string,
  orgId: string,
  notificationType: string,
  channel: "in_app" | "email",
): Promise<boolean> {
  const { data } = await db
    .from("notification_settings")
    .select("enabled")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .eq("notification_type", notificationType)
    .eq("channel", channel)
    .maybeSingle()

  // No row means the user hasn't customised this pref — default to enabled
  return data?.enabled ?? true
}
