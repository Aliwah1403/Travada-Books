import { Calendar01Icon, Wallet01Icon } from "@travada-books/ui/icons"

import { MockButton, MockField, MockLabel, StatusPill } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Payments hero: the invoice page of a part-paid invoice (apps/app
// invoices/detail.tsx — the "paid · due" strip, detail rows and the
// Payments list), with the Record payment dialog open in front of it
// (record-payment-dialog.tsx: Amount prefilled with the balance, Payment
// date, Method; the optional Reference field is left out to keep the
// dialog inside the hero). The dialog fully covers the detail rows. The card runs off the right edge of the page.
// ⚠️ Recording only — the method shown is a bank transfer; no M-Pesa in the
// hero (collecting payments is the Coming soon item). Fictional figures:
// 40,000 of 85,000 paid, 45,000 due.

const DETAILS = [
  { label: "Due date", value: "30 Sep 2026" },
  { label: "Issue date", value: "16 Sep 2026" },
  { label: "Invoice no.", value: "INV-0052" },
]

export function RecordPaymentHeroMockup() {
  return (
    <div
      role="img"
      aria-label="Illustration of a part-paid invoice, INV-0052 for Baraka Logistics: KES 40,000 of KES 85,000 paid, KES 45,000 due, with one bank transfer recorded on 18 September. In front of it, the Record payment dialog is filled in for the remaining KES 45,000, paid by bank transfer on 30 September."
      className="relative h-[44rem] select-none sm:h-[42rem] lg:h-full lg:min-h-[42rem]"
    >
      {/* The invoice page, behind, running off the right edge. */}
      <div className="absolute top-12 left-4 w-[36rem] border border-line bg-panel text-ink shadow-xl shadow-ink/10 sm:left-6 lg:top-16 lg:left-16 lg:w-[40rem]">
        <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <span className="font-mono text-xs text-ink-muted">INV-0052</span>
          <span className="text-sm font-medium">Baraka Logistics</span>
          <StatusPill status="partial" />
        </div>
        <div className="flex flex-col gap-4 bg-canvas p-5">
          <div className="border border-line bg-panel px-4 py-3 text-xs">
            <span className="font-medium tabular-nums">KES 40,000.00</span>{" "}
            <span className="text-ink-muted">
              of KES 85,000.00 paid · <span className="font-medium text-status-partial">KES 45,000.00 due</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="divide-y divide-line border border-line bg-panel px-4">
              {DETAILS.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                  <span className="text-ink-muted">{row.label}</span>
                  <span className="font-medium">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="border border-line bg-panel px-4 py-2.5">
              <p className="text-xs font-medium">Payments</p>
              <div className="mt-2 flex flex-col gap-0.5 border-t border-line pt-2.5 text-xs">
                <span className="font-medium tabular-nums">KES 40,000.00</span>
                <span className="text-ink-muted">18 Sep 2026 · Bank Transfer · FT26261XK2Q</span>
                <span className="text-ink-muted">Recorded by Wanjiru</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The dialog, in front. */}
      <div
        {...revealStep(1)}
        className="absolute top-44 left-4 w-[20rem] max-w-[calc(100%-2rem)] border border-line bg-panel p-5 text-ink shadow-2xl shadow-ink/20 sm:left-10 lg:top-48 lg:left-8 lg:w-[22.5rem]"
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Wallet01Icon className="size-4 text-ink-muted" aria-hidden="true" />
          Record payment
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Log a payment received against this invoice. The balance and status update automatically.
        </p>
        <div className="mt-4 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium">Amount</p>
            <MockField addon="KES">45,000.00</MockField>
            <MockLabel>Balance due: KES 45,000.00</MockLabel>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium">Payment date</p>
            <MockField addon={<Calendar01Icon className="size-3.5 text-ink-muted" aria-hidden="true" />}>
              30 Sep 2026
            </MockField>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium">Method</p>
            <MockField select>Bank Transfer</MockField>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <MockButton>Cancel</MockButton>
          <MockButton variant="primary">Record payment</MockButton>
        </div>
      </div>
    </div>
  )
}
