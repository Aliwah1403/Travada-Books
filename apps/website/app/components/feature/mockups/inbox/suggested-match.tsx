import { CancelCircleIcon, CheckmarkCircle02Icon, OutlookIcon } from "@travada-books/ui/icons"

import { MockButton, MockFrame, MockLabel, MockPanel, MockPanelHeader } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Matching row: an inbox item's details (apps/app inbox-details.tsx — the
// fields read off the receipt) with the suggested-match card below it
// (suggested-match.tsx: "Suggested match", a confidence figure, the
// transaction, Confirm / Decline). Fictional receipt.

const FIELDS = [
  { label: "Date", value: "17 Sep 2026" },
  { label: "Amount", value: "KES 1,250.00" },
  { label: "Sender", value: "receipts@kahawahouse.co.ke" },
]

export function SuggestedMatchMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration of a receipt from Kahawa House for KES 1,250 on 17 September, with a suggested match at 86% confidence to a KES 1,250 transaction on the same day, and buttons to confirm or decline it."
    >
      <MockPanel className="mx-auto max-w-md">
        <MockPanelHeader
          title="Kahawa House receipt"
          aside={<OutlookIcon className="size-4" aria-hidden="true" />}
        />
        <div className="flex flex-col gap-4 p-4">
          {/* The receipt itself, in miniature. */}
          <div {...revealStep(1)} className="flex gap-3">
            <div aria-hidden="true" className="flex w-16 shrink-0 flex-col gap-1.5 border border-line bg-canvas p-2">
              <span className="h-1.5 w-8 bg-line-strong" />
              <span className="h-1 w-full bg-line" />
              <span className="h-1 w-10 bg-line" />
              <span className="h-1 w-full bg-line" />
              <span className="mt-1 h-1.5 w-7 self-end bg-line-strong" />
            </div>
            <dl className="flex min-w-0 flex-1 flex-col divide-y divide-line">
              {FIELDS.map((field) => (
                <div key={field.label} className="flex items-center justify-between gap-3 py-1.5 text-xs first:pt-0">
                  <dt className="text-ink-muted">{field.label}</dt>
                  <dd className="truncate font-medium">{field.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div {...revealStep(2)} className="border border-line p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">Suggested match</p>
              <span className="text-xs font-medium text-status-partial">86% confidence</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 bg-canvas px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">Kahawa House</p>
                <MockLabel>17 Sep 2026</MockLabel>
              </div>
              <span className="shrink-0 text-xs font-medium tabular-nums">KES 1,250.00</span>
            </div>
            <div className="mt-3 flex gap-2">
              <MockButton variant="primary" className="flex-1">
                <CheckmarkCircle02Icon className="size-3.5" aria-hidden="true" />
                Confirm
              </MockButton>
              <MockButton className="flex-1">
                <CancelCircleIcon className="size-3.5" aria-hidden="true" />
                Decline
              </MockButton>
            </div>
          </div>
        </div>
      </MockPanel>
    </MockFrame>
  )
}
