import { Wallet01Icon } from "@travada-books/ui/icons"

import { MockButton, MockFrame, MockPanel, StatusPill } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Record row: a part-paid invoice after two payments were recorded against
// it (apps/app invoices/detail.tsx — the "paid · due" strip and the
// Payments list: amount, date, method, reference, recorded by). A
// different invoice from the hero, so the page doesn't repeat itself.
// ⚠️ Recording only — bank transfer and cash; no M-Pesa on this page
// (collecting payments is the Coming soon item). Fictional figures:
// 80,000 of 120,000 paid, 40,000 due.

const PAYMENTS = [
  { amount: "KES 50,000.00", date: "04 Sep 2026", method: "Bank Transfer", ref: "FT26247JQ4M", by: "Wanjiru" },
  { amount: "KES 30,000.00", date: "19 Sep 2026", method: "Cash", ref: "Receipt 0142", by: "Otieno" },
]

export function PaymentsRecordedMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration of invoice INV-0061 for Tausi Events, part-paid: KES 80,000 of KES 120,000 paid, KES 40,000 due. Its Payments list shows two recorded payments — KES 50,000 by bank transfer on 4 September and KES 30,000 in cash on 19 September — each with a reference and who recorded it."
    >
      <MockPanel className="mx-auto max-w-md">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <p className="flex min-w-0 items-center gap-2 text-sm">
            <span className="font-mono text-xs text-ink-muted">INV-0061</span>
            <span className="truncate font-medium">Tausi Events</span>
          </p>
          <StatusPill status="partial" />
        </div>

        <div className="flex flex-col gap-3 bg-canvas p-3 @sm:p-4">
          <div {...revealStep(1)} className="border border-line bg-panel px-4 py-3 text-xs">
            <p>
              <span className="font-medium tabular-nums">KES 80,000.00</span>{" "}
              <span className="text-ink-muted">
                of KES 120,000.00 paid · <span className="font-medium text-status-partial">KES 40,000.00 due</span>
              </span>
            </p>
            <div className="mt-2.5 h-1 bg-canvas">
              <div className="h-full w-2/3 bg-status-partial" />
            </div>
          </div>

          <div {...revealStep(2)} className="border border-line bg-panel">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <p className="text-xs font-medium">Payments</p>
              <MockButton className="h-7 px-2.5">
                <Wallet01Icon className="size-3.5" aria-hidden="true" />
                Record payment
              </MockButton>
            </div>
            <div className="divide-y divide-line">
              {PAYMENTS.map((payment, index) => (
                <div key={payment.ref} {...revealStep(3 + index)} className="flex flex-col gap-0.5 px-4 py-3 text-xs">
                  <span className="font-medium tabular-nums">{payment.amount}</span>
                  <span className="text-ink-muted">
                    {payment.date} · {payment.method} · {payment.ref}
                  </span>
                  <span className="text-ink-muted">Recorded by {payment.by}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </MockPanel>
    </MockFrame>
  )
}
