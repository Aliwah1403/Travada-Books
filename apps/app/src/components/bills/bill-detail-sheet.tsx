import type { ReactNode } from "react"
import { Link } from "react-router"
import { Button } from "@travada-books/ui/components/button"
import { Separator } from "@travada-books/ui/components/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@travada-books/ui/components/sheet"
import { CheckmarkCircle01Icon, Clock01Icon, File01Icon } from "@travada-books/ui/icons"
import { BillStatusBadge, billDisplayStatus } from "@/components/bills/bill-status-badge"
import { billDueHelper } from "@/components/bills/bill-due-label"
import { useBillActions } from "@/components/bills/use-bill-actions"
import { useFormatDate } from "@/hooks/use-format-date"
import { formatCurrency } from "@/lib/format"
import type { Bill } from "@/lib/queries/bills"

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}

type Props = {
  bill: Bill | null
  onOpenChange: (open: boolean) => void
  onEdit: (bill: Bill) => void
  onDelete: (bill: Bill) => void
}

export function BillDetailSheet({ bill, onOpenChange, onEdit, onDelete }: Props) {
  const { formatDate } = useFormatDate()
  const { markPaid, viewDocument } = useBillActions()

  return (
    <Sheet open={!!bill} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        {bill && (
          <>
            <SheetHeader className="px-6 pt-6">
              <SheetTitle>{bill.vendor_name}</SheetTitle>
              <SheetDescription>{bill.bill_number ? `Bill ${bill.bill_number}` : "Supplier bill"}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-5 overflow-auto px-6 py-4 scrollbar-hide">
              <div className="flex items-center justify-between">
                <span className="text-xl font-semibold tracking-tight">
                  {formatCurrency(bill.amount, bill.currency)}
                </span>
                <BillStatusBadge status={billDisplayStatus(bill)} />
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <Field label="Issue date" value={bill.issue_date ? formatDate(bill.issue_date) : "—"} />
                <Field
                  label="Due date"
                  value={
                    <>
                      {bill.due_date ? formatDate(bill.due_date) : "—"}
                      {billDueHelper(bill) && (
                        <span className="ml-1.5 font-normal text-muted-foreground">{billDueHelper(bill)}</span>
                      )}
                    </>
                  }
                />
                <Field label="Paid on" value={bill.paid_at ? formatDate(bill.paid_at) : "—"} />
                <Field label="Source" value={bill.source === "inbox" ? "Inbox" : "Added manually"} />
              </div>

              {bill.transaction_id && (
                <p className="text-xs text-muted-foreground">
                  Marked paid because this document was matched to a bank transaction.{" "}
                  <Link to="/transactions" className="text-foreground underline underline-offset-2">
                    View transactions
                  </Link>
                </p>
              )}

              {bill.note && (
                <div className="text-xs">
                  <p className="text-muted-foreground">Note</p>
                  <p className="mt-1 whitespace-pre-wrap">{bill.note}</p>
                </div>
              )}

              {bill.inbox_item && (
                <Button variant="outline" className="w-fit gap-2 text-xs" onClick={() => viewDocument(bill)}>
                  <File01Icon size={13} />
                  View document
                </Button>
              )}
            </div>

            <Separator />
            <SheetFooter className="flex-row flex-wrap gap-2 px-6 py-4">
              {bill.status === "unpaid" ? (
                <Button className="flex-1 gap-2" onClick={() => markPaid(bill, true)}>
                  <CheckmarkCircle01Icon size={14} />
                  Mark as paid
                </Button>
              ) : !bill.transaction_id ? (
                <Button variant="outline" className="flex-1 gap-2" onClick={() => markPaid(bill, false)}>
                  <Clock01Icon size={14} />
                  Mark as unpaid
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => onEdit(bill)}>
                Edit
              </Button>
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => onDelete(bill)}
              >
                Delete
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
