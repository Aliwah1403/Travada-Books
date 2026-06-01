import { type ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@travada-books/ui/components/avatar";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { InvoiceActions } from "./invoice-actions";
import { type Invoice } from "./invoice-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData> {
    onQuoteClick?: (quoteId: string) => void;
  }
}

export const invoiceColumns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "number",
    header: "Invoice no.",
    enableSorting: true,
    enableHiding: false,
    cell: ({ row }) => (
      <span className='font-mono text-xs'>{row.original.number}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: true,
    enableHiding: false,
    cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "dueDate",
    header: "Due / Next",
    enableSorting: true,
    cell: ({ row }) => (
      <span className='text-xs text-muted-foreground'>
        {row.original.dueDate}
      </span>
    ),
  },
  {
    accessorKey: "customer",
    header: "Customer",
    enableSorting: true,
    enableHiding: false,
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <Avatar className='size-5'>
          <AvatarImage src={row.original.customerLogoUrl ?? undefined} />
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
    enableSorting: true,
    enableHiding: false,
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
    enableSorting: true,
    cell: ({ row }) => (
      <span className='text-xs text-muted-foreground'>
        {row.original.issueDate}
      </span>
    ),
  },
  {
    accessorKey: "recurring",
    header: "Recurring",
    enableSorting: false,
    cell: ({ row }) => {
      const freq = row.original.recurring;
      const series = row.original.invoiceRecurring;
      const seriesStatus = row.original.seriesStatus;

      if (freq === "one_time" || !series) {
        return <span className='text-xs text-muted-foreground'>One time</span>;
      }

      const freqLabels: Record<string, string> = {
        weekly: "Weekly", biweekly: "Bi-weekly", monthly: "Monthly",
        quarterly: "Quarterly", yearly: "Yearly",
      };
      const freqLabel = freqLabels[freq] ?? freq;

      let subtitle: string | null = null;
      if (seriesStatus === "paused") {
        subtitle = "Paused";
      } else if (seriesStatus === "canceled") {
        subtitle = "Canceled";
      } else if (seriesStatus === "completed") {
        subtitle = "Completed";
      } else if (seriesStatus === "active" && series.nextScheduledAt) {
        if (series.endType === "after_count" && series.endAfterCount) {
          subtitle = `${series.currentCount} of ${series.endAfterCount} · Next ${new Date(series.nextScheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
        } else {
          subtitle = `Next ${new Date(series.nextScheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
        }
      }

      return (
        <div className='flex flex-col'>
          <span className='text-xs'>{freqLabel}</span>
          {subtitle && <span className='text-[11px] text-muted-foreground'>{subtitle}</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "quoteNumber",
    header: "Quote",
    enableSorting: false,
    cell: ({ row, table }) =>
      row.original.quoteNumber && row.original.quoteId ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            table.options.meta?.onQuoteClick?.(row.original.quoteId!);
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
    enableHiding: false,
    cell: ({ row }) => (
      <InvoiceActions
        invoiceId={row.original.id}
        status={row.original.status}
        token={row.original.token}
        invoiceNumber={row.original.number}
        seriesId={row.original.seriesId}
        seriesStatus={row.original.seriesStatus}
      />
    ),
  },
];
