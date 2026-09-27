import { ArrowDown01Icon, ArrowRight01Icon, Cancel01Icon, Download01Icon, Tag01Icon, TickIcon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { CategoryDot, MockCheckbox, MockFrame, MockPanel } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Bulk actions row: the transactions table with four rows selected and the
// floating bulk action bar (apps/app transactions/bulk-action-bar.tsx:
// "N selected", Categorize, Actions, Export), its Actions menu open on
// Payment mode. Payment modes are the app's own list. M-Pesa is fine here —
// this page is about importing and sorting statements.

type Row = {
  date: string
  name: string
  category: string
  dot: string
  amount: string
  income?: boolean
  selected?: boolean
}

const ROWS: Row[] = [
  { date: "03 Sep", name: "Kahawa House", category: "Meals", dot: "bg-status-partial", amount: "–KES 1,250.00", selected: true },
  { date: "04 Sep", name: "Safiri Cabs", category: "Transport", dot: "bg-status-sent", amount: "–KES 640.00", selected: true },
  { date: "05 Sep", name: "Karatasi Stationers", category: "Office supplies", dot: "bg-status-scheduled", amount: "–KES 3,400.00", selected: true },
  { date: "08 Sep", name: "Safiri Cabs", category: "Transport", dot: "bg-status-sent", amount: "–KES 820.00", selected: true },
  { date: "09 Sep", name: "Kilele Studio", category: "Income", dot: "bg-status-paid", amount: "+KES 85,000.00", income: true },
  { date: "10 Sep", name: "Canvas Cloud", category: "Software", dot: "bg-brand-line", amount: "–KES 1,950.00" },
]

const MODES = ["M-Pesa", "Bank Transfer", "Cash", "Card"]

const GRID =
  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 @sm:grid-cols-[auto_3.25rem_minmax(0,1fr)_auto] @md:grid-cols-[auto_3.25rem_minmax(0,1fr)_8rem_auto]"

export function BulkActionsMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration of the transactions list with four transactions selected. The bulk action bar reads 4 selected, and its Actions menu is open on Payment mode, with M-Pesa chosen for all four at once."
    >
      <div className="relative pb-6">
        <MockPanel>
          <div className={cn(GRID, "border-b border-line px-3 py-2 text-xs text-ink-muted")}>
            <MockCheckbox />
            <span className="hidden @sm:block">Date</span>
            <span>Description</span>
            <span className="hidden @md:block">Category</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="divide-y divide-line">
            {ROWS.map((row, index) => (
              <div
                key={`${row.name}-${row.date}`}
                {...revealStep(1 + index)}
                className={cn(GRID, "px-3 py-2.5 text-xs", row.selected && "bg-canvas")}
              >
                <MockCheckbox checked={row.selected} />
                <span className="hidden text-ink-muted tabular-nums @sm:block">{row.date}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{row.name}</span>
                  <span className="flex items-center gap-1.5 text-ink-muted @md:hidden">
                    <CategoryDot className={row.dot} />
                    {row.category}
                  </span>
                </span>
                <span className="hidden min-w-0 items-center gap-2 @md:flex">
                  <CategoryDot className={row.dot} />
                  <span className="truncate">{row.category}</span>
                </span>
                <span className={cn("text-right tabular-nums", row.income && "font-medium text-status-paid")}>
                  {row.amount}
                </span>
              </div>
            ))}
          </div>
        </MockPanel>

        {/* The bar floats over the bottom of the table, menu open above it. */}
        <div {...revealStep(8)} className="absolute inset-x-0 bottom-0 flex justify-center px-2">
          <div className="relative flex items-center gap-1 border border-line bg-panel px-2 py-1.5 text-xs shadow-lg shadow-ink/10">
            <span className="flex items-center gap-1.5 pr-2 pl-1 font-medium tabular-nums">
              4 selected
              <Cancel01Icon className="size-3.5 text-ink-subtle" aria-hidden="true" />
            </span>
            <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
            <span className="hidden items-center gap-1.5 px-2 py-1 @sm:flex">
              <Tag01Icon className="size-3.5" aria-hidden="true" />
              Categorize
            </span>
            <span className="flex items-center gap-1.5 bg-canvas px-2 py-1 font-medium">
              Actions
              <ArrowDown01Icon className="size-3.5" aria-hidden="true" />
            </span>
            <span className="hidden items-center gap-1.5 px-2 py-1 @md:flex">
              <Download01Icon className="size-3.5" aria-hidden="true" />
              Export
            </span>
          </div>
        </div>

        {/* Actions menu + Payment mode submenu, opening upwards from the bar. */}
        <div {...revealStep(9)} className="absolute right-2 bottom-12 flex items-end gap-1 text-xs @sm:right-6">
          <div className="hidden w-40 flex-col border border-line bg-panel p-1 shadow-lg shadow-ink/10 @md:flex">
            {["Set status", "Payment mode", "Recurring"].map((item) => (
              <span
                key={item}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5",
                  item === "Payment mode" ? "bg-canvas font-medium" : "text-ink-muted",
                )}
              >
                {item}
                <ArrowRight01Icon className="size-3.5 text-ink-subtle" aria-hidden="true" />
              </span>
            ))}
          </div>
          <div className="flex w-40 flex-col border border-line bg-panel p-1 shadow-lg shadow-ink/10">
            <span className="px-2 pt-1 pb-1.5 text-xs text-ink-subtle @md:hidden">Payment mode</span>
            {MODES.map((mode) => (
              <span
                key={mode}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5",
                  mode === "M-Pesa" ? "bg-brand-soft font-medium text-brand" : "text-ink-muted",
                )}
              >
                {mode}
                {mode === "M-Pesa" ? <TickIcon className="size-3.5" aria-hidden="true" /> : null}
              </span>
            ))}
          </div>
        </div>
      </div>
    </MockFrame>
  )
}
