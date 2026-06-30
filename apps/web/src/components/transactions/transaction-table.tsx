import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type RowSelectionState,
  type VisibilityState,
  type OnChangeFn,
} from "@tanstack/react-table";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@travada-books/ui/components/table";
import { Button } from "@travada-books/ui/components/button";
import {
  Wallet01Icon,
  SortingIcon,
  SortingUpIcon,
  SortingDownIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@travada-books/ui/icons";
import { cn } from "@travada-books/ui/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { useTableScroll } from "@/hooks/use-table-scroll";
import {
  transactionColumns,
  type Transaction,
  type TransactionStatus,
  type PaymentMode,
  type TransactionFrequency,
} from "./transaction-columns";
import { BulkActionBar } from "./bulk-action-bar";
import type { TransactionCategory } from "@/lib/queries/transactions";

// Width of the sticky left columns (used to offset subsequent sticky cols)
const SELECT_COL_WIDTH = 48;
const DATE_COL_WIDTH = 130;
const NAME_COL_WIDTH = 240;

// Min-width per column id — applied to <th> via style
const COL_WIDTHS: Record<string, number> = {
  select: SELECT_COL_WIDTH,
  date: DATE_COL_WIDTH,
  name: NAME_COL_WIDTH,
  counterpartyName: 180,
  categoryName: 180,
  status: 120,
  paymentMode: 110,
  amount: 150,
  taxAmount: 120,
  recurring: 80,
  linkedInvoice: 110,
  actions: 52,
};

function stickyHeaderClass(colId: string) {
  if (colId === "select") return "sticky left-0 z-30 bg-background";
  if (colId === "date") return "sticky z-30 bg-background";
  if (colId === "name") return "sticky z-30 bg-background";
  if (colId === "actions") return "sticky right-0 z-30 bg-background";
  return "";
}

function stickyBodyClass(colId: string) {
  if (colId === "select") return "sticky left-0 z-20 bg-background";
  if (colId === "date") return "sticky z-20 bg-background";
  if (colId === "name") return "sticky z-20 bg-background";
  if (colId === "actions") return "sticky right-0 z-20 bg-background";
  return "";
}

type TransactionTableProps = {
  data: Transaction[];
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: OnChangeFn<VisibilityState>;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkUpdate: (ids: string[], update: { category_id?: string; status?: TransactionStatus; payment_mode?: PaymentMode; recurring?: boolean; frequency?: TransactionFrequency | null }) => void;
  onBulkExport: (ids: string[]) => void;
  categories: TransactionCategory[];
  formatDate: (value: string | Date | null | undefined) => string;
};

function HorizontalPagination({
  canScrollLeft,
  canScrollRight,
  onScrollLeft,
  onScrollRight,
}: {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScrollLeft: () => void;
  onScrollRight: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={!canScrollLeft}
        onClick={onScrollLeft}
        aria-label="Scroll left"
      >
        <ArrowLeft01Icon
          size={13}
          className={cn(canScrollLeft ? "text-foreground" : "text-muted-foreground")}
        />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={!canScrollRight}
        onClick={onScrollRight}
        aria-label="Scroll right"
      >
        <ArrowRight01Icon
          size={13}
          className={cn(canScrollRight ? "text-foreground" : "text-muted-foreground")}
        />
      </Button>
    </div>
  );
}

export function TransactionTable({
  data,
  columnVisibility,
  onColumnVisibilityChange,
  onEdit,
  onDelete,
  onBulkDelete,
  onBulkUpdate,
  onBulkExport,
  categories,
  formatDate,
}: TransactionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const { containerRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } =
    useTableScroll();

  const table = useReactTable({
    data,
    columns: transactionColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    state: { sorting, columnVisibility, rowSelection },
    meta: {
      onEditTransaction: onEdit,
      onDeleteTransaction: onDelete,
      formatDate,
    },
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedIds = selectedRows.map((r) => r.original.id);

  return (
    <div className="space-y-2">
      <div className="rounded-lg border overflow-hidden">
        {table.getRowModel().rows.length === 0 ? (
          <EmptyState
            icon={Wallet01Icon}
            title="No transactions found"
            description="Try adjusting your filters or record a new transaction to get started."
          />
        ) : (
          <div ref={containerRef} className="overflow-x-auto">
            <table
              className="caption-bottom text-xs min-w-[1800px]"
              style={{ tableLayout: "fixed", width: "100%" }}
            >
              <colgroup>
                {table.getVisibleFlatColumns().map((col) => (
                  <col key={col.id} style={{ width: COL_WIDTHS[col.id] ?? 120 }} />
                ))}
              </colgroup>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const colId = header.column.id;
                      const canSort = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      const isNameCol = colId === "name";
                      return (
                        <TableHead
                          key={header.id}
                          style={{
                            minWidth: COL_WIDTHS[colId],
                            ...(colId === "date" ? { left: SELECT_COL_WIDTH } : {}),
                            ...(colId === "name" ? { left: SELECT_COL_WIDTH + DATE_COL_WIDTH } : {}),
                          }}
                          className={cn(
                            "h-12 px-4 text-xs",
                            canSort && "cursor-pointer select-none",
                            stickyHeaderClass(colId),
                          )}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              {header.isPlaceholder ? null : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              {canSort && (
                                <span className="text-muted-foreground">
                                  {sorted === "asc" ? (
                                    <SortingUpIcon size={12} />
                                  ) : sorted === "desc" ? (
                                    <SortingDownIcon size={12} />
                                  ) : (
                                    <SortingIcon size={12} />
                                  )}
                                </span>
                              )}
                            </div>
                            {isNameCol && (
                              <HorizontalPagination
                                canScrollLeft={canScrollLeft}
                                canScrollRight={canScrollRight}
                                onScrollLeft={scrollLeft}
                                onScrollRight={scrollRight}
                              />
                            )}
                          </div>
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
                    className="cursor-pointer active:opacity-80"
                    onClick={() => onEdit(row.original.id)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const colId = cell.column.id;
                      return (
                        <TableCell
                          key={cell.id}
                          style={
                            colId === "date" ? { left: SELECT_COL_WIDTH } :
                            colId === "name" ? { left: SELECT_COL_WIDTH + DATE_COL_WIDTH } :
                            undefined
                          }
                          className={cn("py-3 px-4", stickyBodyClass(colId))}
                          onClick={colId === "actions" || colId === "select" ? (e) => e.stopPropagation() : undefined}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </table>
          </div>
        )}
      </div>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setRowSelection({})}
        onDelete={() => {
          onBulkDelete(selectedIds);
          setRowSelection({});
        }}
        onSetCategory={(categoryId) => {
          onBulkUpdate(selectedIds, { category_id: categoryId });
          setRowSelection({});
        }}
        onSetStatus={(status) => {
          onBulkUpdate(selectedIds, { status });
          setRowSelection({});
        }}
        onSetPaymentMode={(mode) => {
          onBulkUpdate(selectedIds, { payment_mode: mode });
          setRowSelection({});
        }}
        onSetRecurring={(recurring, frequency) => {
          onBulkUpdate(selectedIds, { recurring, frequency: frequency ?? null });
          setRowSelection({});
        }}
        onExport={() => {
          onBulkExport(selectedIds);
          setRowSelection({});
        }}
        categories={categories}
      />
    </div>
  );
}
