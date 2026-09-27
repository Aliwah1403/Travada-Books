import { ChevronRightIcon, QuoteIcon, ReceiptTextIcon, type Icon } from "@travada-books/ui/icons"

import { MockButton, MockFrame, MockLabel, MockPanel } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Quotes and statements row: the portal's Quotes and Statements tabs
// (apps/app customer-portal/portal.tsx): a quote waiting for an answer with
// its valid-until date and Review, and each generated statement by period.
// ⚠️ No M-Pesa on this page. Fictional quote and dates.

function DocIcon({ icon: DocGlyph }: { icon: Icon }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center bg-canvas">
      <DocGlyph className="size-4 text-ink-muted" aria-hidden="true" />
    </span>
  )
}

const STATEMENTS = [
  { period: "1 Jul – 30 Sep 2026", generated: "Generated 30 Sep 2026" },
  { period: "1 Apr – 30 Jun 2026", generated: "Generated 1 Jul 2026" },
]

function Tab({ label, count }: { label: string; count: number }) {
  return (
    <div className="border-b border-line px-4 py-2.5">
      <span className="border border-line-strong px-2 py-1 text-xs font-medium">
        {label} ({count})
      </span>
    </div>
  )
}

export function PortalDocumentsMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration of the customer portal's Quotes and Statements tabs: quote QUO-0021 for KES 96,000, valid until 3 October 2026, with a Review button, and two statements, for July to September and April to June 2026."
    >
      <div className="mx-auto flex max-w-md flex-col gap-3">
        <MockPanel step={1}>
          <Tab label="Quotes" count={1} />
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <DocIcon icon={QuoteIcon} />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">QUO-0021</p>
                <MockLabel>Valid until 3 Oct 2026</MockLabel>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden text-xs font-medium tabular-nums @xs:inline">KES 96,000.00</span>
              <MockButton className="h-7 px-2.5">Review</MockButton>
            </div>
          </div>
        </MockPanel>

        <MockPanel step={2}>
          <Tab label="Statements" count={2} />
          <div className="divide-y divide-line">
            {STATEMENTS.map((statement, index) => (
              <div
                key={statement.period}
                {...revealStep(3 + index)}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <DocIcon icon={ReceiptTextIcon} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{statement.period}</p>
                    <MockLabel>{statement.generated}</MockLabel>
                  </div>
                </div>
                <ChevronRightIcon className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
              </div>
            ))}
          </div>
        </MockPanel>
      </div>
    </MockFrame>
  )
}
