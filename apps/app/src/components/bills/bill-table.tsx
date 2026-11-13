import { useMemo, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@travada-books/ui/components/table"
import { SortingDownIcon, SortingIcon, SortingUpIcon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { MobileList, MobileListItem } from "@/components/shared/mobile-list"
import { BillActions } from "@/components/bills/bill-actions"
import { billDueHelper } from "@/components/bills/bill-due-label"
import { BillStatusBadge, billDisplayStatus, type BillDisplayStatus } from "@/components/bills/bill-status-badge"
import { formatCurrency } from "@/lib/format"
import type { Bill } from "@/lib/queries/bills"

// The Bills table, built like the Invoices and Transactions tables: TanStack
// columns with sortable headers, a column picker, and the same rows as cards
// on phones. Filtering happens on the page (bill-filter-columns.ts); this
// only sorts and shows what it's given.

/** Columns the page's "Columns" menu can show or hide. */
export const BILL_HIDEABLE_COLUMNS: { id: string; label: string }[] = [
  { id: "billNumber", label: "Bill no." },
  { id: "issueDate", label: "Issue date" },
  { id: "dueDate", label: "Due date" },
  { id: "paidDate", label: "Paid date" },
  { id: "source", label: "Source" },
]

export const BILL_DEFAULT_HIDDEN: VisibilityState = { issueDate: false, paidDate: false, source: false }

// Overdue first, then unpaid, then paid — what needs paying comes to the top.
const STATUS_RANK: Record<BillDisplayStatus, number> = { overdue: 0, unpaid: 1, paid: 2 }

// Missing dates sort after every real one when ascending.
const dateKey = (value: string | null) => value ?? "9999-12-31"

function SortableHeader({ label, sorted, onClick }: { label: string; sorted: false | "asc" | "desc"; onClick?: (e: unknown) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex items-center gap-1.5 transition-colors hover:text-foreground", sorted ? "text-foreground" : "text-muted-foreground")}
    >
      {label}
      {sorted === "asc" ? (
        <SortingUpIcon className="size-3" />
      ) : sorted === "desc" ? (
        <SortingDownIcon className="size-3" />
      ) : (
        <SortingIcon className="size-3 opacity-40" />
      )}
    </button>
  )
}

type BillTableProps = {
  data: Bill[]
  formatDate: (iso: string) => string
  columnVisibility: VisibilityState
  onColumnVisibilityChange: (visibility: VisibilityState) => void
  onView: (bill: Bill) => void
  onEdit: (bill: Bill) => void
  onDelete: (bill: Bill) => void
}

export function BillTable({ data, formatDate, columnVisibility, onColumnVisibilityChange, onView, onEdit, onDelete }: BillTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "status", desc: false },
    { id: "dueDate", desc: false },
  ])

  const columns = useMemo<ColumnDef<Bill>[]>(
    () => [
      {
        id: "vendor",
        accessorFn: (b) => b.vendor_name.toLowerCase(),
        header: "Supplier",
        enableHiding: false,
        cell: ({ row }) => <span className="text-xs font-medium">{row.original.vendor_name}</span>,
      },
      {
        id: "billNumber",
        accessorFn: (b) => b.bill_number ?? "",
        header: "Bill no.",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.bill_number ?? "—"}</span>,
      },
      {
        id: "issueDate",
        accessorFn: (b) => dateKey(b.issue_date),
        header: "Issue date",
        cell: ({ row }) => <span className="text-xs">{row.original.issue_date ? formatDate(row.original.issue_date) : "—"}</span>,
      },
      {
        id: "dueDate",
        accessorFn: (b) => dateKey(b.due_date),
        header: "Due date",
        cell: ({ row }) => {
          const helper = billDueHelper(row.original)
          return (
            <div className="text-xs">
              {row.original.due_date ? formatDate(row.original.due_date) : "—"}
              {helper && <p className="mt-0.5 text-muted-foreground">{helper}</p>}
            </div>
          )
        },
      },
      {
        id: "paidDate",
        accessorFn: (b) => dateKey(b.paid_at),
        header: "Paid date",
        cell: ({ row }) => <span className="text-xs">{row.original.paid_at ? formatDate(row.original.paid_at) : "—"}</span>,
      },
      {
        id: "amount",
        accessorFn: (b) => b.amount,
        header: "Amount",
        enableHiding: false,
        cell: ({ row }) => <span className="text-xs font-medium">{formatCurrency(row.original.amount, row.original.currency)}</span>,
      },
      {
        id: "source",
        accessorFn: (b) => b.source,
        header: "Source",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.source === "inbox" ? "Inbox" : "Added by hand"}</span>,
      },
      {
        id: "status",
        accessorFn: (b) => STATUS_RANK[billDisplayStatus(b)],
        header: "Status",
        enableHiding: false,
        cell: ({ row }) => <BillStatusBadge status={billDisplayStatus(row.original)} />,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => <BillActions bill={row.original} onEdit={onEdit} onDelete={onDelete} />,
      },
    ],
    [formatDate, onEdit, onDelete],
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: (updater) => {
      onColumnVisibilityChange(typeof updater === "function" ? updater(columnVisibility) : updater)
    },
    state: { sorting, columnVisibility },
    getRowId: (b) => b.id,
  })

  const rows = table.getRowModel().rows

  return (
    <>
      {/* Phones: one tappable card per bill, same sorted rows as the table. */}
      <MobileList>
        {rows.map((row) => {
          const b = row.original
          const helper = billDueHelper(b)
          return (
            <MobileListItem
              key={row.id}
              avatarName={b.vendor_name}
              title={b.vendor_name}
              subtitle={
                <>
                  {b.bill_number && <span className="font-mono">{b.bill_number}</span>}
                  {b.bill_number && (helper || b.due_date) && " · "}
                  {helper ?? (b.due_date ? `Due ${formatDate(b.due_date)}` : null)}
                </>
              }
              amount={formatCurrency(b.amount, b.currency)}
              badge={<BillStatusBadge status={billDisplayStatus(b)} />}
              onClick={() => onView(b)}
            />
          )
        })}
      </MobileList>

      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id} className={cn("h-12 px-4 text-xs", header.column.id === "actions" && "w-12")}>
                    {header.column.getCanSort() ? (
                      <SortableHeader
                        label={String(header.column.columnDef.header)}
                        sorted={header.column.getIsSorted()}
                        onClick={header.column.getToggleSortingHandler()}
                      />
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer transition-opacity active:opacity-80"
                onClick={() => onView(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="py-3"
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
    </>
  )
}
