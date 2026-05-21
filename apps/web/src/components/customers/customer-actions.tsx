import { useState } from "react"
import { useNavigate } from "react-router"
import { MoreHorizontalIcon } from "@travada-books/ui/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu"
import { Button } from "@travada-books/ui/components/button"
import { EditCustomerSheet, type CustomerEditValues } from "./edit-customer-sheet"

type CustomerActionsProps = {
  customerId: string
  customer: CustomerEditValues
}

export function CustomerActions({ customerId, customer }: CustomerActionsProps) {
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontalIcon size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate(`/customers/${customerId}`)}>
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/invoices/create")}>
            New invoice
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditCustomerSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
      />
    </>
  )
}
