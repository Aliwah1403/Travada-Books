import { Badge } from "@travada-books/ui/components/badge"
import { cn } from "@travada-books/ui/lib/utils"
import { ArrowUpRight01Icon, ArrowDownLeft01Icon } from "@travada-books/ui/icons"

export type TransactionType = "income" | "expense"

type TransactionTypeBadgeProps = {
  type: TransactionType
}

export function TransactionTypeBadge({ type }: TransactionTypeBadgeProps) {
  if (type === "income") {
    return (
      <Badge className={cn("border-0 font-medium rounded-md", "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400")}>
        <ArrowUpRight01Icon size={12} />
        Income
      </Badge>
    )
  }

  return (
    <Badge className={cn("border-0 font-medium rounded-md", "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400")}>
      <ArrowDownLeft01Icon size={12} />
      Expense
    </Badge>
  )
}
