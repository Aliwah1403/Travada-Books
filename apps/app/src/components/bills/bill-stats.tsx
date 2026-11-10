import NumberFlow from "@number-flow/react"
import { Card, CardContent } from "@travada-books/ui/components/card"
import { formatCurrency } from "@/lib/format"

export type BillStat = {
  label: string
  count: number
  /** Totals per currency. Never summed across currencies. */
  totals: Record<string, number>
}

function StatCard({ stat, orgCurrency }: { stat: BillStat; orgCurrency: string }) {
  const others = Object.entries(stat.totals).filter(([cur]) => cur !== orgCurrency)
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col justify-between gap-3">
          <div>
            <NumberFlow
              value={stat.totals[orgCurrency] ?? 0}
              format={{ style: "currency", currency: orgCurrency }}
              locales="en-US"
              className="text-xl font-semibold tracking-tight"
            />
            {others.length > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {others.map(([cur, amt]) => `+ ${formatCurrency(amt, cur)}`).join("  ")}
              </p>
            )}
          </div>
          <div>
            <p className="mt-1 text-sm">{stat.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {stat.count === 0 ? "No bills" : `${stat.count} bill${stat.count !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function BillStats({ unpaid, overdue, dueSoon, orgCurrency }: {
  unpaid: BillStat
  overdue: BillStat
  dueSoon: BillStat
  orgCurrency: string
}) {
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] *:min-w-[72%] *:snap-start md:grid md:gap-4 md:overflow-visible md:*:min-w-0 md:grid-cols-3">
      <StatCard stat={unpaid} orgCurrency={orgCurrency} />
      <StatCard stat={overdue} orgCurrency={orgCurrency} />
      <StatCard stat={dueSoon} orgCurrency={orgCurrency} />
    </div>
  )
}
