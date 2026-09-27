import { Cancel01Icon, CheckmarkCircle01Icon, Copy01Icon, Download01Icon } from "@travada-books/ui/icons"

import { MockButton, MockFrame, MockLabel, MockPanel } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Respond row: the public quote page the customer opens from the link
// (apps/app quote-public/token.tsx): top bar with Copy Link and Download
// PDF, the quote document, then Decline and Accept Quote. No login.
// ⚠️ No M-Pesa on this page. Fictional business, customer and figures.

const LINES = [
  { item: "Event branding — concept and artwork", qty: "1", amount: "60,000.00" },
  { item: "Printed banners, 3 × 1 m", qty: "4", amount: "36,000.00" },
]

export function PublicQuoteMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration of a quote opened from its link in a browser, with no login: quote QUO-0021 from Kilele Studio to Tausi Events for KES 96,000, valid until 3 October 2026, with Decline and Accept Quote buttons under it."
    >
      <MockPanel className="mx-auto max-w-md">
        {/* The public page's top bar. */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <img src="/logo.svg" alt="" width={20} height={20} className="size-5" />
            Travada Books
          </span>
          <span className="flex items-center gap-3 text-ink-subtle">
            <Copy01Icon className="size-4" aria-hidden="true" />
            <Download01Icon className="size-4" aria-hidden="true" />
          </span>
        </div>

        <div className="bg-canvas p-3 @sm:p-4">
          <div {...revealStep(1)} className="border border-line bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Kilele Studio</p>
                <MockLabel className="mt-0.5">Nairobi</MockLabel>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs tracking-wide text-ink-muted uppercase">Quote</p>
                <p className="mt-0.5 text-xs font-medium">QUO-0021</p>
              </div>
            </div>

            <div className="mt-4 flex justify-between gap-3 text-xs">
              <div className="min-w-0">
                <MockLabel>Bill to</MockLabel>
                <p className="mt-0.5 truncate font-medium">Tausi Events</p>
              </div>
              <div className="text-right">
                <MockLabel>Valid until</MockLabel>
                <p className="mt-0.5 font-medium">3 Oct 2026</p>
              </div>
            </div>

            <div className="mt-4 border-t border-line">
              {LINES.map((line) => (
                <div
                  key={line.item}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-line py-2 text-xs @sm:grid-cols-[minmax(0,1fr)_2rem_auto]"
                >
                  <span className="truncate">{line.item}</span>
                  <span className="hidden text-right text-ink-muted @sm:block">{line.qty}</span>
                  <span className="text-right tabular-nums">{line.amount}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">KES 96,000.00</span>
              </div>
            </div>
          </div>

          <div {...revealStep(2)} className="mt-3 flex justify-end gap-2">
            <MockButton variant="destructive">
              <Cancel01Icon className="size-3.5" aria-hidden="true" />
              Decline
            </MockButton>
            <MockButton variant="primary">
              <CheckmarkCircle01Icon className="size-3.5" aria-hidden="true" />
              Accept Quote
            </MockButton>
          </div>
        </div>
      </MockPanel>
    </MockFrame>
  )
}
