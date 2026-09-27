import { cn } from "@travada-books/ui/lib/utils"

import { MockFrame, MockPanel, MockPanelHeader } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Statements row: a customer statement (apps/app statement-public/
// token.tsx): each invoice is a charge, what's been paid against it a
// payment ("Payments received to date" for a part-paid invoice), with a
// running balance from the opening balance to the closing one, and the
// Total charges / Total payments / Closing balance summary.
// Fictional figures, consistent with the portal hero: closing 147,500.

type Entry = { date: string; description: string; invoice: string; charge?: string; payment?: string; balance: string }

const ENTRIES: Entry[] = [
  { date: "1 Aug", description: "Invoice issued", invoice: "INV-0041", charge: "60,000.00", balance: "60,000.00" },
  { date: "18 Aug", description: "Invoice issued", invoice: "INV-0046", charge: "42,500.00", balance: "102,500.00" },
  { date: "16 Sep", description: "Invoice issued", invoice: "INV-0052", charge: "85,000.00", balance: "187,500.00" },
  { date: "30 Sep", description: "Payments received to date", invoice: "INV-0052", payment: "40,000.00", balance: "147,500.00" },
]

const GRID =
  "grid grid-cols-[minmax(0,1fr)_5rem_5.5rem] items-center gap-x-3 @md:grid-cols-[3rem_minmax(0,1fr)_5rem_5rem_5.5rem]"

export function StatementLedgerMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration of a customer statement for Baraka Logistics, July to September 2026: three invoices issued as charges and KES 40,000 of payments received, with a running balance rising to KES 187,500 and closing at KES 147,500."
    >
      <MockPanel>
        <MockPanelHeader
          title="Statement · Baraka Logistics"
          aside={<span className="hidden @sm:inline">1 Jul – 30 Sep 2026 · KES</span>}
        />
        <div className={cn(GRID, "border-b border-line px-3 py-2 text-xs text-ink-muted @sm:px-4")}>
          <span className="hidden @md:block">Date</span>
          <span>Description</span>
          <span className="hidden text-right @md:block">Charges</span>
          <span className="text-right">Payments</span>
          <span className="text-right">Balance</span>
        </div>
        <div {...revealStep(1)} className={cn(GRID, "border-b border-dashed border-line bg-canvas px-3 py-2.5 text-xs @sm:px-4")}>
          <span className="hidden text-ink-muted @md:block">—</span>
          <span className="font-medium">Opening balance</span>
          <span className="hidden text-right text-ink-subtle @md:block">—</span>
          <span className="text-right text-ink-subtle">—</span>
          <span className="text-right font-medium tabular-nums">0.00</span>
        </div>
        {ENTRIES.map((entry, index) => (
          <div
            key={`${entry.invoice}-${entry.date}`}
            {...revealStep(2 + index)}
            className={cn(GRID, "border-b border-dashed border-line px-3 py-2.5 text-xs @sm:px-4")}
          >
            <span className="hidden text-ink-muted tabular-nums @md:block">{entry.date}</span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate">{entry.description}</span>
              <span className="truncate font-mono text-ink-muted">
                {entry.invoice}
                <span className="@md:hidden">
                  {" "}
                  · {entry.charge ? `+${entry.charge}` : entry.date}
                </span>
              </span>
            </span>
            <span className="hidden text-right tabular-nums @md:block">
              {entry.charge ?? <span className="text-ink-subtle">—</span>}
            </span>
            <span className="text-right text-status-paid tabular-nums">
              {entry.payment ?? <span className="text-ink-subtle">—</span>}
            </span>
            <span className="text-right font-medium text-status-overdue tabular-nums">{entry.balance}</span>
          </div>
        ))}
        <div {...revealStep(7)} className="flex flex-col items-end gap-1.5 px-3 py-3 text-xs @sm:px-4">
          <div className="flex w-56 max-w-full justify-between gap-3">
            <span className="text-ink-muted">Total charges</span>
            <span className="tabular-nums">KES 187,500.00</span>
          </div>
          <div className="flex w-56 max-w-full justify-between gap-3">
            <span className="text-ink-muted">Total payments</span>
            <span className="text-status-paid tabular-nums">KES 40,000.00</span>
          </div>
          <div className="mt-1 flex w-56 max-w-full justify-between gap-3 border-t border-line pt-2 text-sm font-semibold">
            <span>Closing balance</span>
            <span className="text-status-overdue tabular-nums">KES 147,500.00</span>
          </div>
        </div>
      </MockPanel>
    </MockFrame>
  )
}
