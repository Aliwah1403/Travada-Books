import { CheckmarkCircle01Icon, GmailIcon, Mail01Icon, OutlookIcon, type Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { MockFrame, MockPanel, MockPanelHeader, Pill } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Capture row: the Inbox list (apps/app inbox-item-card.tsx): title and
// amount, source icon and date, and the status (inbox-status.tsx — Matched,
// Suggested match, Analyzing, No match). Sources are the app's own: Gmail,
// Outlook, or forwarded to the organisation's inbox address.
// Fictional suppliers and amounts.

type Status = "matched" | "suggested" | "analyzing" | "none"

type Item = { title: string; amount?: string; source: Icon; date: string; status: Status }

const ITEMS: Item[] = [
  { title: "Mtandao Fibre — September", amount: "KES 4,999.00", source: GmailIcon, date: "18 Sep 2026", status: "matched" },
  { title: "Kahawa House receipt", amount: "KES 1,250.00", source: OutlookIcon, date: "17 Sep 2026", status: "suggested" },
  { title: "Canvas Cloud invoice", source: GmailIcon, date: "17 Sep 2026", status: "analyzing" },
  { title: "Karatasi Stationers", amount: "KES 3,400.00", source: Mail01Icon, date: "15 Sep 2026", status: "matched" },
  { title: "Safiri Cabs trip receipt", amount: "KES 820.00", source: GmailIcon, date: "14 Sep 2026", status: "none" },
]

function ItemStatus({ status }: { status: Status }) {
  if (status === "matched") {
    return <Pill label="Matched" icon={CheckmarkCircle01Icon} className="bg-status-paid-soft text-status-paid" />
  }
  if (status === "suggested") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-status-partial">
        <span className="size-1.5 rounded-full bg-status-partial" aria-hidden="true" />
        Suggested match
      </span>
    )
  }
  if (status === "analyzing") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
        <span className="size-3 rounded-full border-2 border-line border-t-ink-subtle" aria-hidden="true" />
        Analyzing
      </span>
    )
  }
  return <span className="text-xs text-ink-muted">No match</span>
}

export function InboxListMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration of the Travada Books inbox: receipts pulled in from Gmail, Outlook and a forwarded email, each with its amount and date, marked Matched, Suggested match, Analyzing or No match."
    >
      <MockPanel className="mx-auto max-w-md">
        <MockPanelHeader title="Inbox" aside={<span className="tabular-nums">5 receipts</span>} />
        <div className="divide-y divide-line">
          {ITEMS.map((item, index) => (
            <div
              key={item.title}
              {...revealStep(1 + index)}
              className={cn("flex flex-col gap-1.5 px-4 py-3", index === 1 && "bg-canvas")}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-xs font-medium">{item.title}</p>
                {item.amount ? (
                  <span className="shrink-0 text-xs font-medium tabular-nums">{item.amount}</span>
                ) : (
                  <span className="h-3 w-16 shrink-0 bg-line" aria-hidden="true" />
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <item.source className="size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                  {item.date}
                </span>
                <ItemStatus status={item.status} />
              </div>
            </div>
          ))}
        </div>
      </MockPanel>
    </MockFrame>
  )
}
