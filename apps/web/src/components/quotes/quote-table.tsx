import { useNavigate } from "react-router";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@travada-books/ui/components/table";
import { type QuoteStatus } from "./quote-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FileEditIcon } from "@travada-books/ui/icons";
import { quoteColumns } from "./quote-columns";

export type Quote = {
  id: string;
  number: string;
  token: string;
  status: QuoteStatus;
  validUntil: string;
  customer: string;
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

  const table = useReactTable({
    data,
    columns: quoteColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
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

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="h-12 px-4 text-xs">
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
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
  );
}
