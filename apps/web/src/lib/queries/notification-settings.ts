import { supabase } from "@/lib/supabase"

export type NotificationChannel = "in_app" | "email"

export type NotificationPrefRow = {
  user_id: string
  org_id: string
  notification_type: string
  channel: NotificationChannel
  enabled: boolean
}

// All notification event+channel combos that should always have a row in the DB.
// Seeded on first load so the table always reflects the true state.
const DEFAULTS: { notification_type: string; channel: NotificationChannel; enabled: boolean }[] = [
  { notification_type: "invoice.paid",             channel: "in_app", enabled: true  },
  { notification_type: "invoice.paid",             channel: "email",  enabled: true  },
  { notification_type: "invoice.overdue",          channel: "in_app", enabled: true  },
  { notification_type: "invoice.overdue",          channel: "email",  enabled: true  },
  { notification_type: "invoice.reminder_upcoming",channel: "in_app", enabled: true  },
  { notification_type: "invoice.reminder_upcoming",channel: "email",  enabled: true  },
  { notification_type: "quote.accepted",           channel: "in_app", enabled: true  },
  { notification_type: "quote.accepted",           channel: "email",  enabled: true  },
  { notification_type: "quote.declined",           channel: "in_app", enabled: true  },
  { notification_type: "quote.declined",           channel: "email",  enabled: true  },
  { notification_type: "quote.expired",            channel: "in_app", enabled: true  },
  { notification_type: "quote.expired",            channel: "email",  enabled: false },
  { notification_type: "team.invited",             channel: "email",  enabled: true  },
  { notification_type: "team.joined",              channel: "in_app", enabled: true  },
  { notification_type: "team.joined",              channel: "email",  enabled: true  },
]

export async function getNotificationPrefs(
  userId: string,
  orgId: string,
): Promise<NotificationPrefRow[]> {
  const { data, error } = await supabase
    .from("notification_settings")
    .select("user_id, org_id, notification_type, channel, enabled")
    .eq("user_id", userId)
    .eq("org_id", orgId)

  if (error) throw error
  const rows = (data ?? []) as NotificationPrefRow[]

  const missing = DEFAULTS.filter(
    (d) => !rows.some((r) => r.notification_type === d.notification_type && r.channel === d.channel),
  )

  if (missing.length > 0) {
    const toInsert = missing.map((d) => ({ user_id: userId, org_id: orgId, ...d }))
    const { error: seedError } = await supabase
      .from("notification_settings")
      .upsert(toInsert, { onConflict: "user_id,org_id,notification_type,channel" })
    if (seedError) throw seedError
    return [...rows, ...toInsert]
  }

  return rows
}

export async function upsertNotificationPref(
  userId: string,
  orgId: string,
  notificationType: string,
  channel: NotificationChannel,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase.from("notification_settings").upsert(
    { user_id: userId, org_id: orgId, notification_type: notificationType, channel, enabled },
    { onConflict: "user_id,org_id,notification_type,channel" },
  )
  if (error) throw error
}
