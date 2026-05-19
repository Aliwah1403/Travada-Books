type StatCard = {
  label: string
  amount: string
  count: number
}

type InvoiceStatsProps = {
  open: StatCard
  overdue: StatCard
  paid: StatCard
}

function StatCard({ label, amount, count }: StatCard) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-xl font-semibold tracking-tight">{amount}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {count === 0 ? "No invoices" : `${count} invoice${count !== 1 ? "s" : ""}`}
      </p>
    </div>
  )
}

export function InvoiceStats({ open, overdue, paid }: InvoiceStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard {...open} />
      <StatCard {...overdue} />
      <StatCard {...paid} />
    </div>
  )
}
