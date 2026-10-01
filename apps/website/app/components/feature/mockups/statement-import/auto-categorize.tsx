import { Spokes } from "@travada-books/ui/components/spokes"
import { cn } from "@travada-books/ui/lib/utils"

import { CategoryDot, MockFrame, MockPanel, MockPanelHeader } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// "They sort themselves" row: a bank statement mid-import. Raw statement
// lines (as banks print them) already carry a category and colour dot; the
// last two are still "Analyzing", as in the app's transactions table
// (transaction-columns.tsx), and the import progress toast
// (import-progress-toast.tsx) floats over the corner. The Spokes spinner
// is frozen: mockups are static. M-Pesa is fine here — this page is about
// importing and sorting statements.

type Row = {
  date: string
  line: string
  category?: string
  dot?: string
  amount: string
  income?: boolean
}

const ROWS: Row[] = [
  { date: "01 Sep", line: "RENT SEPT MUTHAIGA HEIGHTS", category: "Rent", dot: "bg-status-overdue", amount: "–KES 85,000.00" },
  { date: "02 Sep", line: "POS SHELL WESTLANDS", category: "Fuel & transport", dot: "bg-status-sent", amount: "–KES 6,200.00" },
  { date: "03 Sep", line: "GOOGLE *WORKSPACE", category: "Software", dot: "bg-brand-line", amount: "–KES 2,350.00" },
  { date: "04 Sep", line: "RTGS KILELE STUDIO LTD", category: "Income", dot: "bg-status-paid", amount: "+KES 120,000.00", income: true },
  { date: "05 Sep", line: "KPLC PREPAID 54321", category: "Utilities", dot: "bg-status-scheduled", amount: "–KES 3,000.00" },
  { date: "06 Sep", line: "MPESA TRANSFER CHARGE", category: "Bank fees", dot: "bg-ink-subtle", amount: "–KES 110.00" },
  { date: "07 Sep", line: "KAHAWA HOUSE NRB", amount: "–KES 1,250.00" },
  { date: "08 Sep", line: "AMZN MKTP US*2K4", amount: "–KES 4,780.00" },
]

const GRID =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 @sm:grid-cols-[3.25rem_minmax(0,1fr)_auto] @md:grid-cols-[3.25rem_minmax(0,1fr)_8.5rem_auto]"

// Frozen spinner — the app's Analyzing indicator, without the spin.
function Analyzing({ className }: { className?: string }) {
  return (
    <span className={cn("items-center gap-1.5 text-ink-subtle", className)}>
      <Spokes className="size-3 shrink-0" style={{ animationName: "none" }} aria-hidden="true" />
      Analyzing
    </span>
  )
}

function Category({ row, className }: { row: Row; className?: string }) {
  if (!row.category || !row.dot) return <Analyzing className={cn("flex", className)} />
  return (
    <span className={cn("min-w-0 items-center gap-2", className)}>
      <CategoryDot className={row.dot} />
      <span className="truncate">{row.category}</span>
    </span>
  )
}

export function AutoCategorizeMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration of a bank statement being imported. Each raw statement line, such as POS SHELL WESTLANDS or GOOGLE *WORKSPACE, has already been given a colour-coded category like Fuel and transport or Software, while the last two lines are still being analysed. A progress toast reads Analyzing transactions, 46 of 48 sorted."
    >
      <div className="relative pb-10">
        <MockPanel>
          <MockPanelHeader title="Transactions" aside="equity-statement-sep.pdf" />
          <div className={cn(GRID, "border-b border-line px-3 py-2 text-xs text-ink-muted")}>
            <span className="hidden @sm:block">Date</span>
            <span>Description</span>
            <span className="hidden @md:block">Category</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="divide-y divide-line">
            {ROWS.map((row, index) => (
              <div key={row.line} {...revealStep(1 + index)} className={cn(GRID, "px-3 py-2.5 text-xs")}>
                <span className="hidden text-ink-muted tabular-nums @sm:block">{row.date}</span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-mono tracking-tight">{row.line}</span>
                  <Category row={row} className="flex text-ink-muted @md:hidden" />
                </span>
                <Category row={row} className="hidden @md:flex" />
                <span className={cn("text-right tabular-nums", row.income && "font-medium text-status-paid")}>
                  {row.amount}
                </span>
              </div>
            ))}
          </div>
        </MockPanel>

        {/* Import progress toast, floating over the bottom corner. */}
        <div
          {...revealStep(10)}
          className="absolute right-2 bottom-0 w-56 border border-line bg-panel p-3 text-xs shadow-lg shadow-ink/10 @sm:right-4 @sm:w-64"
        >
          <div className="flex items-center gap-2.5">
            <Spokes className="size-4 shrink-0 text-ink-muted" style={{ animationName: "none" }} aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-medium">Analyzing transactions…</p>
              <p className="mt-0.5 text-ink-muted tabular-nums">46 of 48 sorted</p>
            </div>
          </div>
          <div className="mt-3 h-1 bg-canvas">
            <div className="h-full w-11/12 bg-brand-line" />
          </div>
        </div>
      </div>
    </MockFrame>
  )
}
