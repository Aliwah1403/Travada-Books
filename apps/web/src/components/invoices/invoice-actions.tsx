import { useNavigate } from "react-router";
import { MoreHorizontalIcon } from "@travada-books/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import { Button } from "@travada-books/ui/components/button";

type InvoiceActionsProps = {
  invoiceId: string;
};

export function InvoiceActions({ invoiceId }: InvoiceActionsProps) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon-sm'>
          <MoreHorizontalIcon size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => navigate(`/invoices/${invoiceId}`)}>
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/invoices/${invoiceId}`)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem>Mark as paid</DropdownMenuItem>
        <DropdownMenuItem>Copy link</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className='text-destructive focus:text-destructive'>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
