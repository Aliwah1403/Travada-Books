import { useState } from "react";
import { useNavigate } from "react-router";
import { MoreHorizontalIcon } from "@travada-books/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@travada-books/ui/components/alert-dialog";
import { Button } from "@travada-books/ui/components/button";
import {
  EditCustomerSheet,
  type CustomerEditValues,
} from "./edit-customer-sheet";

type CustomerActionsProps = {
  customerId: string;
  customer: CustomerEditValues;
  onDelete?: () => void;
  onUpdated?: () => void;
};

export function CustomerActions({
  customerId,
  customer,
  onDelete,
  onUpdated,
}: CustomerActionsProps) {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon-sm'>
            <MoreHorizontalIcon size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem
            onClick={() => navigate(`/customers/${customerId}`)}
          >
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/invoices/create")}>
            New invoice
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className='text-destructive focus:text-destructive'
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{customer.name}</strong> will be permanently deleted. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='h-10 w-20'>Cancel</AlertDialogCancel>
            <Button
              variant='destructive'
              className='h-10 w-20'
              onClick={() => {
                setDeleteOpen(false);
                onDelete?.();
              }}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditCustomerSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        customerId={customerId}
        onUpdated={onUpdated}
      />
    </>
  );
}
