import { PencilEdit01Icon, Sent02Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import {
  MockButton,
  MockFrame,
  MockNotice,
  MockPanel,
  MockPanelHeader,
  QuoteStatusPill,
} from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Revise row: a declined quote's page (apps/app quotes/detail.tsx): the
// Declined badge, the red banner with the customer's reason, the Activity
// list, and the two ways forward the page offers for a declined quote —
// Edit, then Resend Quote. ⚠️ No M-Pesa on this page. Fictional quote.

const ACTIVITY = [
  { label: "Created", date: "2 Sep, 10:05" },
  { label: "Sent by email", date: "2 Sep, 10:07" },
  { label: "Viewed", date: "3 Sep, 08:31" },
  { label: "Declined", date: "4 Sep, 14:12", declined: true },
]

export function DeclinedQuoteMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration of a declined quote, QUO-0016 for Mawingu Consulting. The customer's reason reads: the budget only covers the first phase this quarter. Its activity shows it was created, sent, viewed and declined, with Edit and Resend Quote buttons to revise it and send it again."
    >
      <MockPanel className="mx-auto max-w-md">
        <MockPanelHeader
          title={
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-ink-muted">QUO-0016</span>
              <span className="truncate">Mawingu Consulting</span>
            </span>
          }
          aside={<QuoteStatusPill status="declined" />}
        />
        <div className="flex flex-col gap-4 p-4">
          <div {...revealStep(1)}>
            <MockNotice tone="overdue">
              <p className="font-medium">Quote declined</p>
              <p className="mt-1 italic">"The budget only covers the first phase this quarter."</p>
            </MockNotice>
          </div>

          <div {...revealStep(2)}>
            <p className="text-xs font-medium">Activity</p>
            <ol className="mt-2 flex flex-col">
              {ACTIVITY.map((item) => (
                <li key={item.label} className="flex items-center gap-3 py-1.5 text-xs">
                  <span
                    aria-hidden="true"
                    className={cn("size-2 shrink-0 rounded-full", item.declined ? "bg-status-overdue" : "bg-ink-subtle")}
                  />
                  <span className="flex-1">{item.label}</span>
                  <span className="text-ink-muted tabular-nums">{item.date}</span>
                </li>
              ))}
            </ol>
          </div>

          <div {...revealStep(3)} className="flex justify-end gap-2 border-t border-line pt-4">
            <MockButton>
              <PencilEdit01Icon className="size-3.5" aria-hidden="true" />
              Edit
            </MockButton>
            <MockButton variant="primary">
              <Sent02Icon className="size-3.5" aria-hidden="true" />
              Resend Quote
            </MockButton>
          </div>
        </div>
      </MockPanel>
    </MockFrame>
  )
}
