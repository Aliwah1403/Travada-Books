import { Invoice01Icon } from "@travada-books/ui/icons"

import { MockFragment, MockFragments, QuoteStatusPill, StatusPill } from "~/components/feature/mockups/primitives"

// Quotes hero: from yes to invoice, in three fragments of real UI.
// 1. The quote, now Accepted (apps/app quote-status-badge.tsx), with the
//    activity line the quote page records.
// 2. The green banner the quote page shows once the invoice exists
//    (quotes/detail.tsx: "Invoice … was created from this quote.").
// 3. That invoice in the invoices list, a Draft, same customer and total.
// ⚠️ No M-Pesa on this page. Fictional customer and figures.

const ROW = "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 @sm:grid-cols-[4.5rem_minmax(0,1fr)_auto_auto]"

export function AcceptedFragments() {
  return (
    <MockFragments label="Illustration: quote QUO-0018 for Baraka Logistics, KES 145,000, is accepted by the customer; a notice says invoice INV-0057 was created from it; and INV-0057 appears in the invoices list as a draft for the same amount.">
      <MockFragment step={0} align="start">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <span className="font-mono text-xs text-ink-muted">QUO-0018</span>
            <span className="truncate">Baraka Logistics</span>
          </p>
          <QuoteStatusPill status="accepted" />
        </div>
        <div className="flex flex-col gap-3 px-4 py-3.5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-ink-muted">Warehouse signage and wayfinding</p>
              <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">KES 145,000.00</p>
            </div>
            <p className="shrink-0 text-right text-xs text-ink-muted">
              Valid until
              <br />
              <span className="text-ink">30 Sep 2026</span>
            </p>
          </div>
          <p className="flex items-center gap-2 border-t border-line pt-3 text-xs text-ink-muted">
            <span className="size-1.5 shrink-0 rounded-full bg-status-paid" aria-hidden="true" />
            Accepted · 12 Sep 2026, 16:42
          </p>
        </div>
      </MockFragment>

      <MockFragment
        step={1}
        align="center"
        className="border-status-paid/25 bg-status-paid-soft text-status-paid sm:w-[70%] md:w-[56%]"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs">
          <span className="flex min-w-0 items-center gap-2">
            <Invoice01Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>
              Invoice <span className="font-mono font-semibold">INV-0057</span> was created from this quote.
            </span>
          </span>
          <span className="hidden shrink-0 font-medium underline underline-offset-2 @xs:inline">View Invoice</span>
        </div>
      </MockFragment>

      <MockFragment step={2} align="end">
        <div className={`${ROW} border-b border-line px-4 py-2 text-xs text-ink-muted`}>
          <span className="hidden @sm:block">Invoice no.</span>
          <span>Customer</span>
          <span className="text-right">Amount</span>
          <span className="w-20">Status</span>
        </div>
        <div className={`${ROW} px-4 py-3 text-xs`}>
          <span className="hidden font-mono text-ink-muted @sm:block">INV-0057</span>
          <span className="truncate font-medium">Baraka Logistics</span>
          <span className="text-right font-medium tabular-nums">KES 145,000.00</span>
          <span className="w-20">
            <StatusPill status="draft" />
          </span>
        </div>
      </MockFragment>
    </MockFragments>
  )
}
