import { Link } from "react-router"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu"
import { Button } from "@travada-books/ui/components/button"
import {
  MoreHorizontalIcon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  File01Icon,
  PencilEdit01Icon,
  Delete01Icon,
} from "@travada-books/ui/icons"
import type { Bill } from "@/lib/queries/bills"
import { useBillActions } from "@/components/bills/use-bill-actions"

type Props = {
  bill: Bill
  onEdit: (bill: Bill) => void
  onDelete: (bill: Bill) => void
}

export function BillActions({ bill, onEdit, onDelete }: Props) {
  const { markPaid, viewDocument } = useBillActions()
  const matched = !!bill.transaction_id

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Bill actions" />}>
        <MoreHorizontalIcon size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {bill.status === "unpaid" ? (
          <DropdownMenuItem onClick={() => markPaid(bill, true)} className="gap-2">
            <CheckmarkCircle01Icon size={13} className="shrink-0" />
            Mark as paid
          </DropdownMenuItem>
        ) : matched ? (
          <DropdownMenuItem render={<Link to="/transactions" />} className="gap-2">
            <CheckmarkCircle01Icon size={13} className="shrink-0" />
            Matched to a transaction
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => markPaid(bill, false)} className="gap-2">
            <Clock01Icon size={13} className="shrink-0" />
            Mark as unpaid
          </DropdownMenuItem>
        )}
        {bill.inbox_item && (
          <DropdownMenuItem onClick={() => viewDocument(bill)} className="gap-2">
            <File01Icon size={13} className="shrink-0" />
            View document
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onEdit(bill)} className="gap-2">
          <PencilEdit01Icon size={13} className="shrink-0" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(bill)}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <Delete01Icon size={13} className="shrink-0" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
