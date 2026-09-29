import { CheckmarkCircle01Icon, Pdf01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { CategoryDot } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Statement import hero: "a year of records, sorted in one upload". Behind,
// the Transactions page (apps/app transactions: income / expenses / net
// cards, then the table) holding a year of statement lines, January to
// December, every one categorised — running off the right edge. In front,
// the finished import: one PDF, twelve months, every transaction sorted,
// with the categories it found. The table sits to the right of the card
// (lg) or above it (below lg) so the raw statement lines stay readable.
// Same stage pattern as the payments hero
// (record-payment-hero.tsx). M-Pesa is fine here — this page is about
// importing statements. Fictional figures.

const STATS = [
  { label: "Income", value: "KES 4,860,000", tone: "text-status-paid" },
  { label: "Expenses", value: "KES 3,214,500", tone: "" },
  { label: "Net", value: "KES 1,645,500", tone: "text-status-paid" },
]

type Line = { date: string; line: string; category: string; dot: string; amount: string; income?: boolean }

const LINES: Line[] = [
  { date: "03 Jan", line: "RTGS KILELE STUDIO LTD", category: "Income", dot: "bg-status-paid", amount: "+KES 120,000.00", income: true },
  { date: "01 Feb", line: "RENT FEB MUTHAIGA HEIGHTS", category: "Rent", dot: "bg-status-overdue", amount: "–KES 85,000.00" },
  { date: "14 Mar", line: "POS SHELL WESTLANDS", category: "Fuel & transport", dot: "bg-status-sent", amount: "–KES 6,200.00" },
  { date: "02 Apr", line: "GOOGLE *WORKSPACE", category: "Software", dot: "bg-brand-line", amount: "–KES 2,350.00" },
  { date: "20 May", line: "MPESA PAYBILL KPLC", category: "Utilities", dot: "bg-status-scheduled", amount: "–KES 3,000.00" },
  { date: "09 Jul", line: "MPESA FROM TAUSI EVENTS", category: "Income", dot: "bg-status-paid", amount: "+KES 64,000.00", income: true },
  { date: "30 Sep", line: "EXCISE DUTY CHARGES", category: "Bank fees", dot: "bg-ink-subtle", amount: "–KES 110.00" },
  { date: "12 Dec", line: "KRA ITAX PAYMENT", category: "Taxes", dot: "bg-status-partial", amount: "–KES 48,600.00" },
]

const FOUND = [
  { category: "Income", dot: "bg-status-paid", count: 214 },
  { category: "Fuel & transport", dot: "bg-status-sent", count: 187 },
  { category: "Software", dot: "bg-brand-line", count: 96 },
  { category: "Bank fees", dot: "bg-ink-subtle", count: 402 },
]

export function StatementImportHeroMockup() {
  return (
    <div
      role="img"
      aria-label="Illustration of a finished statement import: one PDF, equity-statement-2025.pdf, covering January to December 2025, with all 1,248 transactions imported and categorised. Behind it, the transactions list shows statement lines from across the year — rent, fuel, software, utilities, client payments, bank fees and tax — each with a colour-coded category, and totals for income, expenses and net."
      className="relative h-[43rem] select-none lg:h-full lg:min-h-[42rem]"
    >
      {/* The Transactions page, behind, running off the right edge. */}
      <div className="absolute top-8 left-4 w-[38rem] border border-line bg-panel text-ink shadow-xl shadow-ink/10 sm:left-6 lg:top-16 lg:left-64 lg:w-[44rem]">
        <div className="border-b border-line px-5 py-3.5 text-sm font-medium">Transactions</div>
        <div className="flex flex-col gap-4 bg-canvas p-5">
          <div className="grid grid-cols-3 border border-line bg-panel">
            {STATS.map((stat, i) => (
              <div key={stat.label} className={cn("px-4 py-3", i > 0 && "border-l border-line")}>
                <p className={cn("text-sm font-semibold tabular-nums", stat.tone)}>{stat.value}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{stat.label} · 2025</p>
              </div>
            ))}
          </div>
          <div className="border border-line bg-panel">
            <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_8.5rem_7.5rem] gap-x-3 border-b border-line px-4 py-2 text-xs text-ink-muted">
              <span>Date</span>
              <span>Description</span>
              <span>Category</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="divide-y divide-line">
              {LINES.map((line) => (
                <div
                  key={line.line}
                  className="grid grid-cols-[3.25rem_minmax(0,1fr)_8.5rem_7.5rem] items-center gap-x-3 px-4 py-2.5 text-xs"
                >
                  <span className="text-ink-muted tabular-nums">{line.date}</span>
                  <span className="truncate font-mono tracking-tight">{line.line}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <CategoryDot className={line.dot} />
                    <span className="truncate">{line.category}</span>
                  </span>
                  <span className={cn("text-right tabular-nums", line.income && "font-medium text-status-paid")}>
                    {line.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* The finished import, in front. */}
      <div
        {...revealStep(1)}
        className="absolute top-[21rem] left-4 w-[19rem] max-w-[calc(100%-2rem)] border border-line bg-panel p-5 text-ink shadow-2xl shadow-ink/20 sm:left-10 lg:top-56 lg:left-6 lg:w-[20rem]"
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CheckmarkCircle01Icon className="size-4 text-status-paid" aria-hidden="true" />
          Import complete
        </p>
        <div className="mt-4 flex items-center gap-3 border border-line bg-canvas px-3 py-2.5">
          <Pdf01Icon className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">equity-statement-2025.pdf</p>
            <p className="text-xs text-ink-muted">Jan – Dec 2025 · 12 months</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium tabular-nums">1,248 transactions</span>
            <span className="text-status-paid">All categorised</span>
          </div>
          <div className="mt-2 h-1 bg-status-paid" />
        </div>
        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3 text-xs">
          {FOUND.map((row) => (
            <div key={row.category} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <CategoryDot className={row.dot} />
                <span className="truncate">{row.category}</span>
              </span>
              <span className="text-ink-muted tabular-nums">{row.count}</span>
            </div>
          ))}
          <span className="text-ink-subtle">+ 9 more categories</span>
        </div>
      </div>
    </div>
  )
}
