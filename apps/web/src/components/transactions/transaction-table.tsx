import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@travada-books/ui/components/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import { Button } from "@travada-books/ui/components/button";
import {
  Wallet01Icon,
  SortingIcon,
  SortingUpIcon,
  SortingDownIcon,
  ColumnsThreeCogIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@travada-books/ui/icons";
import { cn } from "@travada-books/ui/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { useTableScroll } from "@/hooks/use-table-scroll";
import {
  transactionColumns,
  DEFAULT_HIDDEN_COLUMNS,
  type Transaction,
} from "./transaction-columns";

// Width of the two sticky left columns (used to offset the second sticky col)
const DATE_COL_WIDTH = 130;
const NAME_COL_WIDTH = 240;

// Min-width per column id — applied to <th> via style
const COL_WIDTHS: Record<string, number> = {
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
  if (colId === "date") return "sticky left-0 z-30 bg-background";
  if (colId === "name") return "sticky z-30 bg-background";
  if (colId === "actions") return "sticky right-0 z-30 bg-background";
  return "";
}

function stickyBodyClass(colId: string) {
  if (colId === "date") return "sticky left-0 z-20 bg-background";
  if (colId === "name") return "sticky z-20 bg-background";
  if (colId === "actions") return "sticky right-0 z-20 bg-background";
  return "";
}

type TransactionTableProps = {
  data: Transaction[];
  globalFilter?: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
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
  globalFilter,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_HIDDEN_COLUMNS);
  const { containerRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } =
    useTableScroll();

  const table = useReactTable({
    data,
    columns: transactionColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    state: { globalFilter, sorting, columnVisibility },
    meta: {
      onEditTransaction: onEdit,
      onDeleteTransaction: onDelete,
    },
  });

  const hideableColumns = table.getAllColumns().filter((col) => col.getCanHide());

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <ColumnsThreeCogIcon className="size-3.5" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {hideableColumns.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={col.getIsVisible()}
                onCheckedChange={(value) => col.toggleVisibility(!!value)}
                className="text-xs"
              >
                {typeof col.columnDef.header === "string" ? col.columnDef.header : col.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border overflow-hidden">
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
                          ...(colId === "name" ? { left: DATE_COL_WIDTH } : {}),
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
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
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
                          style={colId === "name" ? { left: DATE_COL_WIDTH } : undefined}
                          className={cn("py-3 px-4", stickyBodyClass(colId))}
                          onClick={colId === "actions" ? (e) => e.stopPropagation() : undefined}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={transactionColumns.length} className="p-0">
                    <EmptyState
                      icon={Wallet01Icon}
                      title={
                        globalFilter ? "No transactions match your search" : "No transactions yet"
                      }
                      description={
                        globalFilter
                          ? "Try a different search term or clear the filter."
                          : "Record your first income or expense to get started."
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>
    </div>
  );
}
