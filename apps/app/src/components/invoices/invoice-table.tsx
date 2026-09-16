import { useNavigate } from "react-router";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@travada-books/ui/components/table";
import { type InvoiceStatus } from "./invoice-status-badge";
import { type RecurringFrequency } from "./recurring-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Invoice01Icon } from "@travada-books/ui/icons";
import { invoiceColumns } from "./invoice-columns";
import { useState } from "react";
import { SortingIcon, SortingUpIcon, SortingDownIcon } from "@travada-books/ui/icons";
import { cn } from "@travada-books/ui/lib/utils";

export type Invoice = {
  id: string;
  number: string;
  status: InvoiceStatus;
  dueDate: string | null;
  customer: string;
  customerLogoUrl: string | null;
  amount: number;
  amountPaid: number;
  currency: string;
  convertedAmount: number | null;
  baseCurrency: string | null;
  issueDate: string | null;
  recurring: RecurringFrequency;
  quoteNumber?: string;
  quoteId?: string;
  token: string;
  seriesId?: string;
  seriesStatus?: "active" | "paused" | "completed" | "canceled";
  invoiceRecurring?: {
    nextScheduledAt: string;
    endAfterCount: number | null;
    currentCount: number;
    endType: string;
  } | null;
};

type InvoiceTableProps = {
  data: Invoice[];
  globalFilter?: string;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  onQuoteClick?: (quoteId: string) => void;
};

export function InvoiceTable({ data, globalFilter, columnVisibility = {}, onColumnVisibilityChange, onQuoteClick }: InvoiceTableProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns: invoiceColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnVisibility) : updater;
      onColumnVisibilityChange?.(next);
    },
    state: { globalFilter, sorting, columnVisibility },
    meta: { onQuoteClick },
  });

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Invoice01Icon}
        title='No invoices yet'
        description='Create your first invoice to get started.'
      />
    );
  }

  return (
    <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} className='h-12 px-4 text-xs'>
                      {canSort ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "flex items-center gap-1.5 hover:text-foreground transition-colors",
                            sorted ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <SortingUpIcon className="size-3" />
                          ) : sorted === "desc" ? (
                            <SortingDownIcon className="size-3" />
                          ) : (
                            <SortingIcon className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer transition-opacity active:opacity-80"
                onClick={() => navigate(`/invoices/${row.original.id}`)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className=' py-3'
                    onClick={
                      cell.column.id === "actions" ?
                        (e) => e.stopPropagation()
                      : undefined
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
  );
}
