import { Attachment01Icon, CheckmarkCircle01Icon, GmailIcon, Pdf01Icon } from "@travada-books/ui/icons"

import { CategoryDot, MockFragment, MockFragments, Pill } from "~/components/feature/mockups/primitives"

// Inbox hero: one receipt's trip, in three fragments of real UI.
// 1. The supplier's email in the connected Gmail inbox, PDF attached.
// 2. The same receipt as an item in the Travada Inbox list
//    (apps/app inbox-item-card.tsx), status "Matched" (inbox-status.tsx).
// 3. The transaction it was matched to, now carrying the attachment
//    (transactions table: Date, Description, Category, Amount, Attachment).
// Fictional supplier and amount.

export function ReceiptMatchFragments() {
  return (
    <MockFragments label="Illustration: a receipt from Mtandao Fibre arrives in Gmail as a PDF, appears in the Travada Books inbox marked Matched, and is attached to the matching KES 4,999 transaction on 18 September.">
      <MockFragment step={0} align="start">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-xs text-ink-muted">
          <GmailIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Gmail · Inbox</span>
          <span className="ml-auto shrink-0 tabular-nums">18 Sep, 09:14</span>
        </div>
        <div className="flex flex-col gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Your receipt for September</p>
            <p className="mt-0.5 truncate text-xs text-ink-muted">Mtandao Fibre · billing@mtandaofibre.co.ke</p>
          </div>
          <div className="flex w-fit max-w-full items-center gap-2 border border-line bg-canvas px-2.5 py-1.5 text-xs">
            <Pdf01Icon className="size-4 shrink-0 text-status-overdue" aria-hidden="true" />
            <span className="truncate">receipt-sep-2026.pdf</span>
            <span className="shrink-0 text-ink-subtle">84 KB</span>
          </div>
        </div>
      </MockFragment>

      <MockFragment step={1} align="center" className="sm:w-[62%] md:w-[46%]">
        <div className="flex flex-col gap-1.5 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs font-medium">Mtandao Fibre — September</p>
            <span className="shrink-0 text-xs font-medium tabular-nums">KES 4,999.00</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-xs text-ink-muted">
              <GmailIcon className="size-3.5 shrink-0" aria-hidden="true" />
              18 Sep 2026
            </span>
            <Pill label="Matched" icon={CheckmarkCircle01Icon} className="bg-status-paid-soft text-status-paid" />
          </div>
        </div>
      </MockFragment>

      <MockFragment step={2} align="end">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 border-b border-line px-4 py-2 text-xs text-ink-muted @sm:grid-cols-[3.25rem_minmax(0,1fr)_auto_auto]">
          <span className="hidden @sm:block">Date</span>
          <span>Description</span>
          <span className="text-right">Amount</span>
          <Attachment01Icon className="size-3.5" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 px-4 py-3 text-xs @sm:grid-cols-[3.25rem_minmax(0,1fr)_auto_auto]">
          <span className="hidden text-ink-muted tabular-nums @sm:block">18 Sep</span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium">Mtandao Fibre</span>
            <span className="flex items-center gap-1.5 text-ink-muted">
              <CategoryDot className="bg-status-sent" />
              Internet
            </span>
          </span>
          <span className="text-right tabular-nums">–KES 4,999.00</span>
          <span className="flex items-center gap-1 text-brand-line">
            <Attachment01Icon className="size-3.5" aria-hidden="true" />
            <span className="tabular-nums">1</span>
          </span>
        </div>
      </MockFragment>
    </MockFragments>
  )
}
