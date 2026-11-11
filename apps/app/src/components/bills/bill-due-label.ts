import { daysFromToday, type Bill } from "@/lib/queries/bills"

/** Muted helper under the due date: "3 days overdue", "Due in 2 days". Null for paid or undated bills. */
export function billDueHelper(bill: Pick<Bill, "status" | "due_date">): string | null {
  if (bill.status === "paid" || !bill.due_date) return null
  const days = daysFromToday(bill.due_date)
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`
  if (days === 0) return "Due today"
  if (days === 1) return "Due tomorrow"
  return `Due in ${days} days`
}
