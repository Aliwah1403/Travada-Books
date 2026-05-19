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
import { type InvoiceStatus } from "./invoice-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Invoice01Icon } from "@travada-books/ui/icons";
import { invoiceColumns } from "./invoice-columns";

export type Invoice = {
  id: string;
  number: string;
  status: InvoiceStatus;
  dueDate: string;
  customer: string;
  amount: number;
  currency: string;
  issueDate: string;
  recurring: "one_time" | "recurring";
};

type InvoiceTableProps = {
  data: Invoice[];
  globalFilter?: string;
};

export function InvoiceTable({ data, globalFilter }: InvoiceTableProps) {
  const navigate = useNavigate();

  const table = useReactTable({
    data,
    columns: invoiceColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
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
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className='h-12 px-4 text-xs'>
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
              className='cursor-pointer'
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
