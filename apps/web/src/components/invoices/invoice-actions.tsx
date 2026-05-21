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
import { type InvoiceStatus } from "@/components/invoices/invoice-status-badge";

type InvoiceActionsProps = {
  invoiceId: string;
  status: InvoiceStatus;
};

export function InvoiceActions({ invoiceId, status }: InvoiceActionsProps) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" />}
      >
        <MoreHorizontalIcon size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => navigate(`/invoices/${invoiceId}`)}>
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/invoices/${invoiceId}/edit`)}>
          Edit
        </DropdownMenuItem>
        {status !== "paid" && (
          <DropdownMenuItem>Mark as paid</DropdownMenuItem>
        )}
        {(status === "sent" || status === "overdue") && (
          <DropdownMenuItem>Send reminder</DropdownMenuItem>
        )}
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuItem>Copy link</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
