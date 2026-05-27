import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";
import { deleteQuote } from "@/lib/queries/quotes";
import { useAuth } from "@/contexts/auth-context";

type QuoteActionsProps = {
  quoteId: string;
  quoteToken: string;
  status: QuoteStatus;
};

export function QuoteActions({ quoteId, quoteToken, status }: QuoteActionsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

  const { mutate: handleDelete } = useMutation({
    mutationFn: () => deleteQuote(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes", orgId] });
      toast.success("Quote deleted");
    },
    onError: () => toast.error("Failed to delete quote"),
  });

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/q/${quoteToken}`);
    toast.success("Link copied to clipboard");
  }

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
        <DropdownMenuItem onClick={copyLink}>Copy Link</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => toast.promise(
            new Promise<void>((resolve, reject) => handleDelete(undefined, { onSuccess: () => resolve(), onError: reject })),
            { loading: "Deleting...", success: "Deleted", error: "Failed" },
          )}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
