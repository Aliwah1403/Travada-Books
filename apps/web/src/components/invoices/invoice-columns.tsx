import { type ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@travada-books/ui/components/avatar";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { InvoiceActions } from "./invoice-actions";
import { type Invoice } from "./invoice-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData> {
    onQuoteClick?: (quoteNumber: string) => void;
  }
}

export const invoiceColumns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "number",
    header: "Invoice no.",
    cell: ({ row }) => (
      <span className='font-mono text-xs'>{row.original.number}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => (
      <span className='text-xs text-muted-foreground'>
        {row.original.dueDate}
      </span>
    ),
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <Avatar className='size-5'>
          <AvatarFallback className='text-[9px]'>
            {row.original.customer.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className='text-xs'>{row.original.customer}</span>
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className='text-xs font-medium'>
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
    cell: ({ row }) => (
      <span className='text-xs text-muted-foreground'>
        {row.original.issueDate}
      </span>
    ),
  },
  {
    accessorKey: "recurring",
    header: "Recurring",
    cell: ({ row }) => (
      <span className='text-xs text-muted-foreground'>
        {row.original.recurring === "one_time" ? "One time" : "Recurring"}
      </span>
    ),
  },
  {
    accessorKey: "quoteNumber",
    header: "Quote",
    cell: ({ row, table }) =>
      row.original.quoteNumber ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            table.options.meta?.onQuoteClick?.(row.original.quoteNumber!);
          }}
          className="font-mono text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          {row.original.quoteNumber}
        </button>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <InvoiceActions invoiceId={row.original.id} status={row.original.status} />
    ),
  },
];
