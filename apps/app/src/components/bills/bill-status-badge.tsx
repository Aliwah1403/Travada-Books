import { Badge } from "@travada-books/ui/components/badge"
import { cn } from "@travada-books/ui/lib/utils"
import { CheckmarkCircle01Icon, Clock01Icon, Alert01Icon, type Icon } from "@travada-books/ui/icons"
import { isBillOverdue, type Bill } from "@/lib/queries/bills"

export type BillDisplayStatus = "unpaid" | "overdue" | "paid"

export function billDisplayStatus(bill: Pick<Bill, "status" | "due_date">): BillDisplayStatus {
  if (bill.status === "paid") return "paid"
  return isBillOverdue(bill) ? "overdue" : "unpaid"
}

const statusConfig: Record<BillDisplayStatus, { label: string; icon: Icon; className: string }> = {
  unpaid: {
    label: "Unpaid",
    icon: Clock01Icon,
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  },
  overdue: {
    label: "Overdue",
    icon: Alert01Icon,
    className: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
  paid: {
    label: "Paid",
    icon: CheckmarkCircle01Icon,
    className: "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  },
}

export function BillStatusBadge({ status }: { status: BillDisplayStatus }) {
  const { icon: StatusIcon, label, className } = statusConfig[status]
  return (
    <Badge className={cn("rounded-md border-0 font-medium transition-colors duration-200", className)}>
      <StatusIcon size={12} />
      {label}
    </Badge>
  )
}
