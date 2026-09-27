import { RepeatIcon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import {
  MockAvatar,
  MockFrame,
  MockPanel,
  StatCard,
  StatusPill,
  type MockStatus,
} from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Scheduling row: the invoices page in miniature (Midday's invoice panel,
// rebuilt as our product). Stat cards mirror apps/app invoice-stats.tsx and
// the dashboard's Payment score widget; the table mirrors invoice-columns
// (Due, Customer, Amount, Status + the recurring marker). Fictional
// customers and amounts — illustrative UI, not figures about Travada.
// ⚠️ No M-Pesa anywhere in this mockup (invoicing page rule).

type Row = {
  due: string
  customer: string
  amount: string
  status: MockStatus
  /** Shows the recurring marker beside the customer. */
  recurring?: boolean
}

const ROWS: Row[] = [
  { due: "1 Oct", customer: "Kilele Studio", amount: "KES 85,000", status: "scheduled", recurring: true },
  { due: "3 Oct", customer: "Baraka Logistics", amount: "KES 145,000", status: "scheduled" },
  { due: "5 Oct", customer: "Nyota Designs", amount: "KES 42,500", status: "sent", recurring: true },
  { due: "8 Oct", customer: "Tausi Events", amount: "KES 72,000", status: "partial" },
  { due: "22 Sep", customer: "Mawingu Consulting", amount: "KES 60,000", status: "overdue" },
  { due: "19 Sep", customer: "Amani Dental Clinic", amount: "KES 27,500", status: "paid" },
  { due: "1 Sep", customer: "Kilele Studio", amount: "KES 85,000", status: "paid", recurring: true },
]

// Same columns at every size; the due date drops out in narrow containers.
const GRID = "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 @xs:gap-x-3 @sm:grid-cols-[3.5rem_minmax(0,1fr)_auto_auto]"

export function InvoiceOverviewMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration of the invoices page: open, overdue and paid totals in shillings, a payment score, and a list of invoices marked scheduled, sent, part-paid, overdue and paid."
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 @sm:gap-3">
          <StatCard step={0} label="Open" tone="sent" value="KES 412,500" detail="7 invoices" />
          <StatCard step={1} label="Overdue" tone="overdue" value="KES 60,000" detail="1 invoice" />
          <StatCard step={2} label="Paid" tone="paid" value="KES 948,200" detail="18 invoices" />
          <StatCard step={3} label="Payment score" value="16 days to pay" detail="18 invoices paid">
            {/* The dashboard widget's bar meter: filled ticks = paid on time. */}
            <div className="mt-3 flex h-3 gap-px" aria-hidden="true">
              {Array.from({ length: 24 }, (_, i) => (
                <span key={i} className={cn("flex-1", i < 17 ? "bg-brand-line" : "bg-brand-soft")} />
              ))}
            </div>
          </StatCard>
        </div>

        <MockPanel step={4}>
          <div className={cn(GRID, "border-b border-line px-2.5 py-2 text-xs text-ink-muted @xs:px-3")}>
            <span className="hidden @sm:block">Due</span>
            <span>Customer</span>
            <span className="text-right">Amount</span>
            <span className="w-24">Status</span>
          </div>
          <div className="divide-y divide-line">
            {ROWS.map((row, index) => (
              <div
                key={`${row.customer}-${row.due}`}
                {...revealStep(5 + index)}
                className={cn(GRID, "px-2.5 py-2.5 text-xs @xs:px-3")}
              >
                <span className="hidden text-ink-muted tabular-nums @sm:block">{row.due}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <MockAvatar name={row.customer} className="hidden @sm:inline-flex" />
                  <span className="truncate">{row.customer}</span>
                  {row.recurring ? (
                    <RepeatIcon className="size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                  ) : null}
                </span>
                <span className="text-right font-medium tabular-nums">{row.amount}</span>
                <span className="w-24">
                  <StatusPill status={row.status} />
                </span>
              </div>
            ))}
          </div>
        </MockPanel>
      </div>
    </MockFrame>
  )
}
