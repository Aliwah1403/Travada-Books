import NumberFlow from "@number-flow/react"
import { cn } from "@travada-books/ui/lib/utils"

type TransactionStatsProps = {
  income: number
  expenses: number
  currency: string
  count?: number
  isLoading?: boolean
}

function StatSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-6 py-4 flex-1">
      <div className="h-7 w-32 rounded-md bg-muted animate-pulse" />
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-14 rounded bg-muted animate-pulse" />
        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}

function StatItem({
  label,
  subtitle,
  value,
  currency,
  className,
}: {
  label: string
  subtitle: string
  value: number
  currency: string
  className?: string
}) {
  return (
    <div className="flex flex-col gap-3 px-6 py-4 flex-1">
      <NumberFlow
        value={value}
        format={{ style: "currency", currency }}
        locales="en-US"
        className={cn("text-xl font-semibold tracking-tight", className)}
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

export function TransactionStats({
  income,
  expenses,
  currency,
  count,
  isLoading,
}: TransactionStatsProps) {
  const net = income - expenses
  const countLabel = count != null ? `${count} transaction${count !== 1 ? "s" : ""}` : "Total received"

  if (isLoading) {
    return (
      <div className="flex items-stretch divide-x rounded-lg border overflow-hidden">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
    )
  }

  return (
    <div className="flex items-stretch divide-x rounded-lg border overflow-hidden">
      <StatItem
        label="Income"
        subtitle={countLabel}
        value={income}
        currency={currency}
        className="text-green-600 dark:text-green-400"
      />
      <StatItem
        label="Expenses"
        subtitle="Total spent"
        value={expenses}
        currency={currency}
      />
      <StatItem
        label="Net"
        subtitle="Income − expenses"
        value={net}
        currency={currency}
        className={cn(
          net >= 0
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400",
        )}
      />
    </div>
  )
}
