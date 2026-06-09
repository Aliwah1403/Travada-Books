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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import { Button } from "@travada-books/ui/components/button";
import { type QuoteStatus } from "./quote-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FileEditIcon } from "@travada-books/ui/icons";
import { quoteColumns } from "./quote-columns";
import { useState } from "react";
import { SortingIcon, SortingUpIcon, SortingDownIcon, ColumnsThreeCogIcon } from "@travada-books/ui/icons";
import { cn } from "@travada-books/ui/lib/utils";

export type Quote = {
  id: string;
  number: string;
  token: string;
  status: QuoteStatus;
  validUntil: string;
  customer: string;
  customerLogoUrl: string | null;
  amount: number;
  currency: string;
  issueDate: string;
};

type QuoteTableProps = {
  data: Quote[];
  globalFilter?: string;
};

export function QuoteTable({ data, globalFilter }: QuoteTableProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns: quoteColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    state: { globalFilter, sorting, columnVisibility },
  });

  if (data.length === 0) {
    return (
      <EmptyState
        icon={FileEditIcon}
        title="No quotes yet"
        description="Create your first quote to get started."
      />
    );
  }

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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} className="h-12 px-4 text-xs">
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
                onClick={() => navigate(`/quotes/${row.original.id}`)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="py-3"
                    onClick={
                      cell.column.id === "actions"
                        ? (e) => e.stopPropagation()
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
    </div>
  );
}
