import { cn } from "@travada-books/ui/lib/utils"

import { CategoryDot, MockFrame, MockPanel, MockPanelHeader } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Books row: the transactions table after payments are recorded. Every
// recorded payment becomes an income transaction named after its invoice,
// with the customer as counterparty, category Sales revenue, the payment
// method, and the Invoice column linking back (apps/app
// transaction-columns.tsx; the transaction_per_payment migration).
// M-Pesa appears only as a method that was recorded — allowed on this page.
// Fictional figures, consistent with the hero (INV-0052: 40,000 + 45,000).

type Row = {
  date: string
  name: string
  counterparty: string
  category: string
  dot: string
  method: string
  amount: string
  income?: boolean
  invoice?: string
}

const ROWS: Row[] = [
  { date: "30 Sep", name: "Invoice INV-0052", counterparty: "Baraka Logistics", category: "Sales revenue", dot: "bg-status-paid", method: "Bank Transfer", amount: "+KES 45,000.00", income: true, invoice: "INV-0052" },
  { date: "19 Sep", name: "Invoice INV-0042", counterparty: "Mawingu Consulting", category: "Sales revenue", dot: "bg-status-paid", method: "M-Pesa", amount: "+KES 60,000.00", income: true, invoice: "INV-0042" },
  { date: "18 Sep", name: "Invoice INV-0052", counterparty: "Baraka Logistics", category: "Sales revenue", dot: "bg-status-paid", method: "Bank Transfer", amount: "+KES 40,000.00", income: true, invoice: "INV-0052" },
  { date: "18 Sep", name: "Mtandao Fibre", counterparty: "Internet", category: "Internet", dot: "bg-status-sent", method: "Card", amount: "–KES 4,999.00" },
  { date: "17 Sep", name: "Kahawa House", counterparty: "Meals", category: "Meals", dot: "bg-status-partial", method: "Cash", amount: "–KES 1,250.00" },
]

const GRID =
  "grid grid-cols-[minmax(0,1fr)_auto_4.5rem] items-center gap-x-3 @md:grid-cols-[3.25rem_minmax(0,1fr)_7.5rem_auto_4.5rem]"

export function LinkedTransactionsMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration of the transactions list: each recorded invoice payment appears as income named after its invoice, such as two payments of KES 40,000 and KES 45,000 against INV-0052 from Baraka Logistics, categorised as sales revenue and linked back to the invoice, alongside ordinary expenses."
    >
      <MockPanel>
        <MockPanelHeader title="Transactions" aside={<span>September 2026</span>} />
        <div className={cn(GRID, "border-b border-line px-3 py-2 text-xs text-ink-muted @sm:px-4")}>
          <span className="hidden @md:block">Date</span>
          <span>Description</span>
          <span className="hidden @md:block">Category</span>
          <span className="text-right">Amount</span>
          <span>Invoice</span>
        </div>
        <div className="divide-y divide-line">
          {ROWS.map((row, index) => (
            <div
              key={`${row.name}-${row.date}`}
              {...revealStep(1 + index)}
              className={cn(GRID, "px-3 py-2.5 text-xs @sm:px-4")}
            >
              <span className="hidden text-ink-muted tabular-nums @md:block">{row.date}</span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium">{row.name}</span>
                <span className="truncate text-ink-muted">
                  {row.invoice ? row.counterparty : row.category} · {row.method}
                </span>
              </span>
              <span className="hidden min-w-0 items-center gap-2 @md:flex">
                <CategoryDot className={row.dot} />
                <span className="truncate">{row.category}</span>
              </span>
              <span className={cn("text-right tabular-nums", row.income && "font-medium text-status-paid")}>
                {row.amount}
              </span>
              {row.invoice ? (
                <span className="font-medium underline decoration-line-strong underline-offset-2">{row.invoice}</span>
              ) : (
                <span className="text-ink-subtle">—</span>
              )}
            </div>
          ))}
        </div>
      </MockPanel>
    </MockFrame>
  )
}
