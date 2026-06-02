import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Switch } from "@travada-books/ui/components/switch"
import { Badge } from "@travada-books/ui/components/badge"
import { Separator } from "@travada-books/ui/components/separator"
import { cn } from "@travada-books/ui/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import {
  getNotificationPrefs,
  upsertNotificationPref,
  type NotificationChannel,
  type NotificationPrefRow,
} from "@/lib/queries/notification-settings"

type NotificationEvent = {
  id: string
  label: string
  description: string
  channels: NotificationChannel[]
  defaults: Partial<Record<NotificationChannel, boolean>>
}

type NotificationGroup = {
  label: string
  comingSoon?: boolean
  events: NotificationEvent[]
}

const groups: NotificationGroup[] = [
  {
    label: "Invoices",
    events: [
      {
        id: "invoice.paid",
        label: "Invoice paid",
        description: "A client or payment webhook marks an invoice as paid.",
        channels: ["in_app", "email"],
        defaults: { in_app: true, email: true },
      },
      {
        id: "invoice.overdue",
        label: "Invoice overdue",
        description: "An invoice passes its due date without being paid.",
        channels: ["in_app", "email"],
        defaults: { in_app: true, email: true },
      },
      {
        id: "invoice.reminder_upcoming",
        label: "Upcoming scheduled reminder",
        description:
          "Sent 1 day before an automatic reminder goes out to your client, so you can cancel or edit it in time.",
        channels: ["in_app", "email"],
        defaults: { in_app: true, email: true },
      },
    ],
  },
  {
    label: "Quotes",
    events: [
      {
        id: "quote.accepted",
        label: "Quote accepted",
        description: "A client accepts a quote. A draft invoice is created automatically.",
        channels: ["in_app", "email"],
        defaults: { in_app: true, email: true },
      },
      {
        id: "quote.declined",
        label: "Quote declined",
        description: "A client declines a quote, optionally with a reason.",
        channels: ["in_app", "email"],
        defaults: { in_app: true, email: true },
      },
      {
        id: "quote.expired",
        label: "Quote expired",
        description: "A quote passes its validity date without a response from the client.",
        channels: ["in_app", "email"],
        defaults: { in_app: true, email: false },
      },
    ],
  },
  {
    label: "Team",
    events: [
      {
        id: "team.invited",
        label: "Team member invited",
        description: "Another owner sent an invitation to join your organisation.",
        channels: ["email"],
        defaults: { email: true },
      },
      {
        id: "team.joined",
        label: "Team member joined",
        description: "An invited member accepts and joins your organisation.",
        channels: ["in_app", "email"],
        defaults: { in_app: true, email: true },
      },
    ],
  },
  {
    label: "Billing",
    comingSoon: true,
    events: [
      {
        id: "billing.renewing",
        label: "Subscription renewing",
        description: "Your Travada Books subscription is renewing in 7 days.",
        channels: ["email"],
        defaults: { email: true },
      },
      {
        id: "billing.payment_failed",
        label: "Payment failed",
        description: "A billing payment attempt for your subscription failed.",
        channels: ["email"],
        defaults: { email: true },
      },
    ],
  },
]

function resolvePrefs(
  rows: NotificationPrefRow[],
): Record<string, Partial<Record<NotificationChannel, boolean>>> {
  const state: Record<string, Partial<Record<NotificationChannel, boolean>>> = {}

  for (const group of groups) {
    for (const event of group.events) {
      const resolved: Partial<Record<NotificationChannel, boolean>> = {}
      for (const ch of event.channels) {
        const row = rows.find((r) => r.notification_type === event.id && r.channel === ch)
        resolved[ch] = row ? row.enabled : (event.defaults[ch] ?? true)
      }
      state[event.id] = resolved
    }
  }

  return state
}

function NotificationRow({
  event,
  value,
  onChange,
  disabled,
}: {
  event: NotificationEvent
  value: Partial<Record<NotificationChannel, boolean>>
  onChange: (channel: NotificationChannel, checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={cn("flex items-start justify-between gap-6 py-4", disabled && "opacity-40")}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium">{event.label}</span>
        <span className="text-xs text-muted-foreground">{event.description}</span>
      </div>
      <div className="flex shrink-0 items-center gap-6">
        <div className="flex flex-col items-center gap-1.5">
          <Switch
            checked={event.channels.includes("in_app") ? (value.in_app ?? false) : false}
            onCheckedChange={(checked) => onChange("in_app", checked)}
            disabled={disabled || !event.channels.includes("in_app")}
            className={!event.channels.includes("in_app") ? "opacity-0 pointer-events-none" : ""}
          />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Switch
            checked={event.channels.includes("email") ? (value.email ?? false) : false}
            onCheckedChange={(checked) => onChange("email", checked)}
            disabled={disabled || !event.channels.includes("email")}
            className={!event.channels.includes("email") ? "opacity-0 pointer-events-none" : ""}
          />
        </div>
      </div>
    </div>
  )
}

export function NotificationsPage() {
  const { user, orgId } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = ["notification-prefs", user?.id, orgId]

  const { data: rows = [] } = useQuery({
    queryKey,
    queryFn: () => getNotificationPrefs(user!.id, orgId!),
    enabled: !!user && !!orgId,
  })

  const prefs = resolvePrefs(rows)

  const mutation = useMutation({
    mutationFn: ({
      notificationType,
      channel,
      enabled,
    }: {
      notificationType: string
      channel: NotificationChannel
      enabled: boolean
    }) => upsertNotificationPref(user!.id, orgId!, notificationType, channel, enabled),

    onMutate: async ({ notificationType, channel, enabled }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<NotificationPrefRow[]>(queryKey)

      queryClient.setQueryData<NotificationPrefRow[]>(queryKey, (old = []) => {
        const existing = old.find(
          (r) => r.notification_type === notificationType && r.channel === channel,
        )
        if (existing) {
          return old.map((r) =>
            r.notification_type === notificationType && r.channel === channel
              ? { ...r, enabled }
              : r,
          )
        }
        return [...old, { user_id: user!.id, org_id: orgId!, notification_type: notificationType, channel, enabled }]
      })

      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  function toggle(id: string, channel: NotificationChannel, checked: boolean) {
    mutation.mutate({ notificationType: id, channel, enabled: checked })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold">Notifications</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose how you want to be notified about activity in your account.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {groups.map((group, i) => (
          <div key={group.label}>
            {i > 0 && <Separator className="mb-8" />}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </span>
              <div className="flex items-center gap-6 pr-0.5">
                {group.comingSoon ? (
                  <Badge variant="secondary" className="text-[10px]">Coming soon</Badge>
                ) : (
                  <>
                    <span className="w-9 text-center text-xs font-medium text-muted-foreground">In-app</span>
                    <span className="w-9 text-center text-xs font-medium text-muted-foreground">Email</span>
                  </>
                )}
              </div>
            </div>
            <div className="divide-y">
              {group.events.map((event) => (
                <NotificationRow
                  key={event.id}
                  event={event}
                  value={prefs[event.id] ?? {}}
                  onChange={(channel, checked) => toggle(event.id, channel, checked)}
                  disabled={group.comingSoon}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
