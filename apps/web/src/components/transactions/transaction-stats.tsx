import NumberFlow from "@number-flow/react"
import { Card, CardContent } from "@travada-books/ui/components/card"
import { cn } from "@travada-books/ui/lib/utils"

type TransactionStatsProps = {
  income: number
  expenses: number
  currency: string
}

export function TransactionStats({ income, expenses, currency }: TransactionStatsProps) {
  const net = income - expenses

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <NumberFlow
              value={income}
              format={{ style: "currency", currency }}
              locales="en-US"
              className="text-xl font-semibold tracking-tight text-green-600 dark:text-green-400"
            />
            <div>
              <p className="mt-1 text-sm">Income</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Total received</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <NumberFlow
              value={expenses}
              format={{ style: "currency", currency }}
              locales="en-US"
              className="text-xl font-semibold tracking-tight text-red-600 dark:text-red-400"
            />
            <div>
              <p className="mt-1 text-sm">Expenses</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Total spent</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <NumberFlow
              value={net}
              format={{ style: "currency", currency }}
              locales="en-US"
              className={cn(
                "text-xl font-semibold tracking-tight",
                net >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400",
              )}
            />
            <div>
              <p className="mt-1 text-sm">Net</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Income − expenses</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
