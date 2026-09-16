import { type ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@travada-books/ui/components/avatar";
import { QuoteStatusBadge } from "./quote-status-badge";
import { QuoteActions } from "./quote-actions";
import { type Quote } from "./quote-table";

export const quoteColumns: ColumnDef<Quote>[] = [
  {
    accessorKey: "number",
    header: "Quote no.",
    enableSorting: true,
    enableHiding: false,
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.number}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: true,
    enableHiding: false,
    cell: ({ row }) => <QuoteStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "validUntil",
    header: "Valid Until",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.validUntil}
      </span>
    ),
  },
  {
    accessorKey: "customer",
    header: "Customer",
    enableSorting: true,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="size-5">
          <AvatarImage src={row.original.customerLogoUrl ?? undefined} />
          <AvatarFallback className="text-[9px]">
            {row.original.customer.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs">{row.original.customer}</span>
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    enableSorting: true,
    enableHiding: false,
    cell: ({ row }) => (
      <span className="text-xs font-medium">
        {row.original.currency}{" "}
        {row.original.amount.toLocaleString("en-KE", {
          minimumFractionDigits: 2,
        })}
      </span>
    ),
  },
  {
    accessorKey: "issueDate",
    header: "Issue Date",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.issueDate}
      </span>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <QuoteActions
        quoteId={row.original.id}
        quoteToken={row.original.token}
        status={row.original.status}
      />
    ),
  },
];
