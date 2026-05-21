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
import { type QuoteStatus } from "./quote-status-badge";

type QuoteActionsProps = {
  quoteId: string;
  status: QuoteStatus;
};

export function QuoteActions({ quoteId, status }: QuoteActionsProps) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <MoreHorizontalIcon size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => navigate(`/quotes/${quoteId}`)}>
          View
        </DropdownMenuItem>
        {(status === "draft" || status === "sent") && (
          <DropdownMenuItem onClick={() => navigate(`/quotes/${quoteId}/edit`)}>
            Edit
          </DropdownMenuItem>
        )}
        {status === "accepted" && (
          <DropdownMenuItem>View Invoice</DropdownMenuItem>
        )}
        {status === "draft" && (
          <DropdownMenuItem>Send Quote</DropdownMenuItem>
        )}
        {status === "sent" && (
          <DropdownMenuItem>Send Reminder</DropdownMenuItem>
        )}
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuItem>Copy Link</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
