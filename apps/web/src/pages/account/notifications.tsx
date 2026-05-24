import { useState } from "react"
import { Switch } from "@travada-books/ui/components/switch"
import { Badge } from "@travada-books/ui/components/badge"
import { Separator } from "@travada-books/ui/components/separator"
import { cn } from "@travada-books/ui/lib/utils"

type NotificationChannel = "inApp" | "email"

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
        channels: ["inApp", "email"],
        defaults: { inApp: true, email: true },
      },
      {
        id: "invoice.overdue",
        label: "Invoice overdue",
        description: "An invoice passes its due date without being paid.",
        channels: ["inApp", "email"],
        defaults: { inApp: true, email: true },
      },
      {
        id: "invoice.reminder_upcoming",
        label: "Upcoming scheduled reminder",
        description:
          "Sent 1 day before an automatic reminder goes out to your client, so you can cancel or edit it in time.",
        channels: ["inApp", "email"],
        defaults: { inApp: true, email: true },
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
        channels: ["inApp", "email"],
        defaults: { inApp: true, email: true },
      },
      {
        id: "quote.declined",
        label: "Quote declined",
        description: "A client declines a quote, optionally with a reason.",
        channels: ["inApp", "email"],
        defaults: { inApp: true, email: true },
      },
      {
        id: "quote.expired",
        label: "Quote expired",
        description: "A quote passes its validity date without a response from the client.",
        channels: ["inApp", "email"],
        defaults: { inApp: true, email: false },
      },
    ],
  },
  {
    label: "Team",
    comingSoon: true,
    events: [
      {
        id: "team.invited",
        label: "Team member invited",
        description: "A new member is invited to your organisation.",
        channels: ["email"],
        defaults: { email: true },
      },
      {
        id: "team.joined",
        label: "Team member joined",
        description: "An invited member accepts and joins your organisation.",
        channels: ["inApp"],
        defaults: { inApp: true },
      },
      {
        id: "team.approval_required",
        label: "Invoice requires approval",
        description: "An invoice above the approval threshold is waiting for your sign-off.",
        channels: ["inApp", "email"],
        defaults: { inApp: true, email: true },
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

type NotificationState = Record<string, Partial<Record<NotificationChannel, boolean>>>

function buildDefaults(groups: NotificationGroup[]): NotificationState {
  const state: NotificationState = {}
  for (const group of groups) {
    for (const event of group.events) {
      state[event.id] = { ...event.defaults }
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
            checked={event.channels.includes("inApp") ? (value.inApp ?? false) : false}
            onCheckedChange={(checked) => onChange("inApp", checked)}
            disabled={disabled || !event.channels.includes("inApp")}
            className={!event.channels.includes("inApp") ? "opacity-0 pointer-events-none" : ""}
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
  const [prefs, setPrefs] = useState<NotificationState>(buildDefaults(groups))

  function toggle(id: string, channel: NotificationChannel, checked: boolean) {
    setPrefs((prev) => ({
      ...prev,
      [id]: { ...prev[id], [channel]: checked },
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold">Notifications</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose how you want to be notified about activity in your account.
        </p>
      </div>

      {/* Column headers */}
      <div className="flex items-center justify-between">
        <span />
        <div className="flex items-center gap-6 pr-0.5">
          <span className="w-9 text-center text-xs font-medium text-muted-foreground">In-app</span>
          <span className="w-9 text-center text-xs font-medium text-muted-foreground">Email</span>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {groups.map((group, i) => (
          <div key={group.label}>
            {i > 0 && <Separator className="mb-8" />}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </span>
              {group.comingSoon && (
                <Badge variant="secondary" className="text-[10px]">
                  Coming soon
                </Badge>
              )}
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
