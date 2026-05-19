import { useNavigate } from "react-router"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@travada-books/ui/components/table"
import { Avatar, AvatarFallback } from "@travada-books/ui/components/avatar"
import { InvoiceStatusBadge, type InvoiceStatus } from "./invoice-status-badge"
import { InvoiceActions } from "./invoice-actions"
import { EmptyState } from "@/components/shared/empty-state"
import { Invoice01Icon } from "@hugeicons/core-free-icons"

export type Invoice = {
  id: string
  number: string
  status: InvoiceStatus
  dueDate: string
  customer: string
  amount: number
  currency: string
  issueDate: string
  recurring: "one_time" | "recurring"
}

type InvoiceTableProps = {
  data: Invoice[]
  globalFilter?: string
}

const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "number",
    header: "Invoice no.",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.number}</span>
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
      <span className="text-xs text-muted-foreground">{row.original.dueDate}</span>
    ),
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="size-5">
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
    cell: ({ row }) => (
      <span className="text-xs font-medium">
        {row.original.currency}{" "}
        {row.original.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    accessorKey: "issueDate",
    header: "Issue Date",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">{row.original.issueDate}</span>
    ),
  },
  {
    accessorKey: "recurring",
    header: "Recurring",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.recurring === "one_time" ? "One time" : "Recurring"}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <InvoiceActions invoiceId={row.original.id} />,
  },
]

export function InvoiceTable({ data, globalFilter }: InvoiceTableProps) {
  const navigate = useNavigate()

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
  })

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Invoice01Icon}
        title="No invoices yet"
        description="Create your first invoice to get started."
      />
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-xs">
                  {flexRender(header.column.columnDef.header, header.getContext())}
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
              onClick={() => navigate(`/invoices/${row.original.id}`)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  onClick={cell.column.id === "actions" ? (e) => e.stopPropagation() : undefined}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
