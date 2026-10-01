import { ArrowUpRight01Icon, ChevronRightIcon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { MockAvatar, PhoneFrame, StatusPill, type MockStatus } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Customer portal hero: the portal as a customer sees it on their phone
// (apps/app customer-portal/portal.tsx at phone width): the business's
// mark and "Account for …", the balance-due hero with the overdue line and
// "View oldest overdue invoice", the Total invoiced / Paid / Invoices
// list, the Invoices · Quotes · Statements tabs, the Outstanding / Paid
// toggle with counts, and the outstanding invoices (balance left to pay).
// Figures add up: 60,000 + 42,500 + 45,000 = 147,500 = 612,500 − 465,000.
// ⚠️ No M-Pesa on this page. Fictional business, customer and figures.

type Invoice = { number: string; issued: string; amount: string; status: MockStatus }

const INVOICES: Invoice[] = [
  { number: "INV-0041", issued: "Issued 1 Aug 2026", amount: "KES 60,000.00", status: "overdue" },
  { number: "INV-0046", issued: "Issued 18 Aug 2026", amount: "KES 42,500.00", status: "overdue" },
  { number: "INV-0052", issued: "Issued 16 Sep 2026", amount: "KES 45,000.00", status: "partial" },
]

const TOTALS = [
  { label: "Total invoiced", value: "KES 612,500.00" },
  { label: "Paid", value: "KES 465,000.00", paid: true },
  { label: "Invoices", value: "9" },
]

export function PortalPhoneMockup() {
  return (
    <div
      role="img"
      aria-label="Illustration of a customer portal on a phone, for Baraka Logistics: KES 147,500 balance due, 2 invoices overdue with the oldest due 15 August, KES 612,500 invoiced and KES 465,000 paid across 9 invoices, and the outstanding invoices listed — two overdue and one part-paid."
      className="flex h-[36rem] justify-center overflow-hidden px-4 pt-12 select-none sm:h-[40rem] lg:h-full lg:min-h-[40rem] lg:pt-16 lg:pr-[calc(var(--bleed)+1rem)]"
    >
      <PhoneFrame className="h-fit">
        {/* Top bar: on phones the portal keeps only the business's mark. */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5">
          <MockAvatar name="Kilele Studio" className="size-7" />
          <p className="truncate text-xs text-ink-muted">Account for Baraka Logistics</p>
        </div>

        <div className="flex flex-col gap-4 px-3.5 py-4">
          <div {...revealStep(0)} className="border border-line p-3.5">
            <p className="text-xs font-medium text-ink-muted">Balance due</p>
            <p className="mt-1.5 text-3xl font-semibold tracking-tight text-status-overdue tabular-nums">
              KES 147,500.00
            </p>
            <p className="mt-1.5 text-xs text-status-overdue">2 overdue · oldest due 15 Aug 2026</p>
            <span className="mt-3 inline-flex h-8 items-center gap-1.5 bg-brand px-3 text-xs font-medium text-panel">
              View oldest overdue invoice
              <ArrowUpRight01Icon className="size-3.5" aria-hidden="true" />
            </span>
            <div className="mt-3 flex flex-col">
              {TOTALS.map((row, index) => (
                <div
                  key={row.label}
                  className={cn(
                    "flex items-center justify-between gap-3 py-2 text-xs",
                    index < TOTALS.length - 1 && "border-b border-line",
                  )}
                >
                  <span className="text-ink-muted">{row.label}</span>
                  <span className={cn("font-medium tabular-nums", row.paid && "text-status-paid")}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div {...revealStep(1)} className="flex gap-1 text-xs">
            <span className="border border-line-strong px-2 py-1.5 font-medium">Invoices (9)</span>
            <span className="border border-line px-2 py-1.5 text-ink-muted">Quotes (1)</span>
            <span className="border border-line px-2 py-1.5 text-ink-muted">Statements (2)</span>
          </div>

          <div {...revealStep(2)} className="flex w-fit border border-line text-xs">
            <span className="flex items-center gap-1.5 bg-canvas px-3 py-1.5 font-medium">
              Outstanding
              <span className="rounded-full bg-line px-1.5 tabular-nums">3</span>
            </span>
            <span className="flex items-center gap-1.5 border-l border-line px-3 py-1.5 text-ink-muted">
              Paid
              <span className="rounded-full bg-line px-1.5 tabular-nums">6</span>
            </span>
          </div>

          <div className="-mt-1 flex flex-col">
            {INVOICES.map((invoice, index) => (
              <div
                key={invoice.number}
                {...revealStep(3 + index)}
                className="flex items-center justify-between gap-2 border-b border-line py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{invoice.number}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">{invoice.issued}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-xs font-semibold tabular-nums">{invoice.amount}</p>
                    <StatusPill status={invoice.status} />
                  </div>
                  <ChevronRightIcon className="size-3.5 text-ink-subtle" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </PhoneFrame>
    </div>
  )
}
