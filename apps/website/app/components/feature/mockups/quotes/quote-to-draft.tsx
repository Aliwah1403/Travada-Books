import type { ReactNode } from "react"

import { ArrowDown01Icon, ArrowRight01Icon, Link01Icon, Sent02Icon } from "@travada-books/ui/icons"

import { MockButton, MockFrame, MockLabel, QuoteStatusPill, StatusPill } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Convert row: the accepted quote beside the draft invoice it became, line
// for line — the point is that nothing is retyped. Same quote, customer and
// total as the hero (accepted-fragments.tsx), so the page tells one story.
// Side by side from @lg, stacked with a down arrow below that.
// ⚠️ No M-Pesa on this page. Fictional customer and figures.

const LINES = [
  { item: "Wayfinding signs", qty: "24", amount: "84,000.00" },
  { item: "Installation, 1 day", qty: "1", amount: "38,000.00" },
  { item: "Design and proofs", qty: "1", amount: "23,000.00" },
]

function Doc({
  kind,
  number,
  status,
  step,
  children,
}: {
  kind: string
  number: string
  status: ReactNode
  step: number
  children?: ReactNode
}) {
  return (
    <div {...revealStep(step)} className="flex min-w-0 flex-col border border-line bg-panel shadow-sm shadow-ink/5">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <p className="min-w-0 truncate text-xs">
          <span className="font-mono tracking-wide text-ink-muted uppercase">{kind}</span>{" "}
          <span className="font-medium">{number}</span>
        </p>
        {status}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <MockLabel>Bill to</MockLabel>
        <p className="mt-0.5 truncate text-xs font-medium">Baraka Logistics</p>
        <div className="mt-3 border-t border-line">
          {LINES.map((line) => (
            <div
              key={line.item}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 border-b border-line py-1.5 text-xs @sm:grid-cols-[minmax(0,1fr)_1.5rem_auto]"
            >
              <span className="truncate">{line.item}</span>
              <span className="hidden text-right text-ink-muted tabular-nums @sm:block">{line.qty}</span>
              <span className="text-right tabular-nums">{line.amount}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 text-xs font-semibold">
            <span>Total</span>
            <span className="tabular-nums">KES 145,000.00</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

export function QuoteToDraftMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration: accepted quote QUO-0018 for Baraka Logistics sits beside draft invoice INV-0057, which was created from it. Both list the same three line items — wayfinding signs, installation and design — for the same total of KES 145,000, and the draft is ready to review and send."
    >
      <div className="grid gap-2 @lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @lg:items-stretch">
        <Doc kind="Quote" number="QUO-0018" status={<QuoteStatusPill status="accepted" />} step={0} />

        {/* The hand-off: down when stacked, right when side by side. */}
        <div {...revealStep(2)} className="flex items-center justify-center text-brand-line">
          <span className="flex size-7 items-center justify-center border border-brand-line/40 bg-brand-soft">
            <ArrowDown01Icon className="size-4 @lg:hidden" aria-hidden="true" />
            <ArrowRight01Icon className="hidden size-4 @lg:block" aria-hidden="true" />
          </span>
        </div>

        <Doc kind="Invoice" number="INV-0057" status={<StatusPill status="draft" />} step={4}>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas py-0.5 pr-2 pl-1.5 text-xs text-ink-muted">
              <Link01Icon className="size-3.5" aria-hidden="true" />
              From QUO-0018
            </span>
            <MockButton variant="primary">
              <Sent02Icon className="size-3.5" aria-hidden="true" />
              Review &amp; send
            </MockButton>
          </div>
        </Doc>
      </div>
    </MockFrame>
  )
}
