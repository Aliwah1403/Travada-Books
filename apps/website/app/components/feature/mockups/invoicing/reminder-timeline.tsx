import {
  Alert01Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  Mail01Icon,
  Sent02Icon,
  type Icon,
} from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { MockFrame, MockLabel, MockPanel, MockPanelHeader, StatusPill } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Reminders row: one invoice's history. Mirrors how the product behaves:
// the invoice is marked overdue the day after its due date
// (worker mark-overdue), and one automatic reminder goes out on the
// "Auto reminders" day chosen in invoice settings (3, 5, 7 or 10 days after
// the due date — worker invoice-reminders sends it once per invoice).

type Step = {
  title: string
  detail: string
  date: string
  icon: Icon
  /** Dot + icon colour. */
  tone: string
}

const STEPS: Step[] = [
  { title: "Invoice sent", detail: "Emailed with a link to the invoice", date: "1 Sep", icon: Sent02Icon, tone: "text-status-sent bg-status-sent-soft" },
  { title: "Due date", detail: "14 days after issue", date: "15 Sep", icon: Calendar01Icon, tone: "text-status-draft bg-status-draft-soft" },
  { title: "Marked overdue", detail: "Automatically, the day after", date: "16 Sep", icon: Alert01Icon, tone: "text-status-overdue bg-status-overdue-soft" },
  { title: "Reminder sent", detail: "3 days after the due date", date: "18 Sep", icon: Mail01Icon, tone: "text-brand bg-brand-soft" },
  { title: "Paid", detail: "KES 60,000 recorded", date: "19 Sep", icon: CheckmarkCircle01Icon, tone: "text-status-paid bg-status-paid-soft" },
]

export function ReminderTimelineMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration of one invoice's timeline: sent on 1 September, due on 15 September, marked overdue the next day, a reminder sent automatically three days after the due date, then paid on 19 September."
    >
      <MockPanel className="mx-auto max-w-md">
        <MockPanelHeader
          title={
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-ink-muted">INV-0042</span>
              <span className="truncate">Mawingu Consulting</span>
            </span>
          }
          aside={<StatusPill status="paid" />}
        />
        <ol className="p-4">
          {STEPS.map((step, index) => {
            const last = index === STEPS.length - 1
            return (
              <li key={step.title} {...revealStep(index + 1)} className="relative flex gap-3 pb-5 last:pb-0">
                {/* Hairline joining this dot to the next. */}
                {last ? null : (
                  <span aria-hidden="true" className="absolute top-7 bottom-0 left-3.5 w-px -translate-x-1/2 bg-line" />
                )}
                <span
                  className={cn("relative flex size-7 shrink-0 items-center justify-center rounded-full", step.tone)}
                >
                  <step.icon className="size-3.5" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3 pt-1">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">{step.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-subtle tabular-nums">{step.date}</span>
                </div>
              </li>
            )
          })}
        </ol>
        <div
          {...revealStep(STEPS.length + 1)}
          className="flex items-center justify-between gap-3 border-t border-line bg-canvas px-4 py-3"
        >
          <MockLabel>Auto reminders</MockLabel>
          <span className="text-xs font-medium">3 days after due date</span>
        </div>
      </MockPanel>
    </MockFrame>
  )
}
