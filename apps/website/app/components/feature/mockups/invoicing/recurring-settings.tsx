import { Calendar01Icon, RepeatIcon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { MockAvatar, MockFrame, MockLabel, MockPanel, MockPanelHeader } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Recurring row: the app's recurring-invoice dialog (apps/app
// recurring-dialog.tsx — Repeat, Ends, Upcoming invoices) on a monthly
// invoice. The app picks the frequency from a select; here the options are
// laid out as a segmented control so all of them are visible at once.
// Frequency labels are the ones the app's invoice list uses.

const FREQUENCIES = [
  { label: "Weekly" },
  { label: "Bi-weekly", wide: true },
  { label: "Monthly", selected: true },
  { label: "Quarterly", wide: true },
  { label: "Yearly" },
]

// Monthly from 1 Oct 2026 (a Thursday).
const UPCOMING = [
  { date: "1 Oct 2026", day: "Thu" },
  { date: "1 Nov 2026", day: "Sun" },
  { date: "1 Dec 2026", day: "Tue" },
]

export function RecurringSettingsMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration of a recurring invoice for Kilele Studio: KES 85,000 every month with no end date, showing the next three send dates, 1 October, 1 November and 1 December 2026."
    >
      <MockPanel className="mx-auto max-w-md">
        <MockPanelHeader
          title="Recurring invoice"
          aside={<RepeatIcon className="size-4 text-brand-line" aria-hidden="true" />}
        />
        <div className="flex flex-col gap-5 p-4">
          <div {...revealStep(1)} className="flex items-center gap-3">
            <MockAvatar name="Kilele Studio" className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">Kilele Studio</p>
              <p className="text-xs text-ink-muted">Brand retainer</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">KES 85,000</p>
              <p className="text-xs text-ink-muted">per month</p>
            </div>
          </div>

          <div {...revealStep(2)} className="flex flex-col gap-2">
            <MockLabel>Repeat</MockLabel>
            <div className="flex border border-line bg-canvas p-0.5">
              {FREQUENCIES.map((frequency) => (
                <span
                  key={frequency.label}
                  className={cn(
                    "flex-1 px-1.5 py-1.5 text-center text-xs whitespace-nowrap",
                    frequency.wide && "hidden @sm:block",
                    frequency.selected
                      ? "border border-line bg-panel font-medium text-ink shadow-sm shadow-ink/5"
                      : "border border-transparent text-ink-muted",
                  )}
                >
                  {frequency.label}
                </span>
              ))}
            </div>
          </div>

          <div {...revealStep(3)} className="flex items-center justify-between gap-3 text-xs">
            <MockLabel>Ends</MockLabel>
            <span className="font-medium">Never</span>
          </div>

          <div {...revealStep(4)} className="flex flex-col gap-2">
            <MockLabel>Upcoming invoices</MockLabel>
            <div className="divide-y divide-line border border-line">
              {UPCOMING.map((item) => (
                <div key={item.date} className="flex items-center justify-between px-3 py-2 text-xs">
                  <span className="flex items-center gap-2 font-medium tabular-nums">
                    <Calendar01Icon className="size-3.5 text-ink-subtle" aria-hidden="true" />
                    {item.date}
                  </span>
                  <span className="text-ink-muted">{item.day}</span>
                </div>
              ))}
              <div className="px-3 py-1.5 text-center text-xs text-ink-subtle">…</div>
            </div>
          </div>
        </div>
      </MockPanel>
    </MockFrame>
  )
}
