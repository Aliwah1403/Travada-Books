import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { useDataTableFilters, type FiltersState } from "@bazza-ui/filters"
import { Search01Icon, Cancel01Icon, ReceiptTextIcon, PlusSignIcon, FilterIcon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Tabs, TabsList, TabsTrigger } from "@travada-books/ui/components/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@travada-books/ui/components/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@travada-books/ui/components/alert-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { Filter } from "@/components/ui/filter"
import { BillStats, type BillStat } from "@/components/bills/bill-stats"
import { billMatchesFilters, createBillColumnsConfig } from "@/components/bills/bill-filter-columns"
import { BillStatusBadge, billDisplayStatus } from "@/components/bills/bill-status-badge"
import { billDueHelper } from "@/components/bills/bill-due-label"
import { BillActions } from "@/components/bills/bill-actions"
import { BillFormSheet } from "@/components/bills/bill-form-sheet"
import { BillDetailSheet } from "@/components/bills/bill-detail-sheet"
import { useBillActions } from "@/components/bills/use-bill-actions"
import { useAuth } from "@/contexts/auth-context"
import { useFormatDate } from "@/hooks/use-format-date"
import { formatCurrency } from "@/lib/format"
import { daysFromToday, isBillOverdue, listBills, type Bill } from "@/lib/queries/bills"

type Tab = "unpaid" | "paid" | "all"

// ── URL filter state (same shape as the Invoices page) ───────────────────────

const DATE_COLUMNS = new Set(["dueDate", "issueDate", "paidDate"])

function serializeFilters(state: FiltersState): string {
  return JSON.stringify(
    state.map((f) => ({ ...f, values: f.values.map((v) => (v instanceof Date ? v.toISOString() : v)) })),
  )
}

function deserializeFilters(param: string | null): FiltersState {
  if (!param) return []
  try {
    const parsed = JSON.parse(param) as Array<{ columnId: string; type: string; operator: string; values: unknown[] }>
    return parsed.map((f) => ({
      ...f,
      values:
        f.type === "date" || DATE_COLUMNS.has(f.columnId)
          ? f.values.map((v) => (typeof v === "string" ? new Date(v) : v))
          : f.values,
    })) as FiltersState
  } catch {
    return []
  }
}

function buildStat(label: string, bills: Bill[]): BillStat {
  const totals: Record<string, number> = {}
  for (const b of bills) totals[b.currency] = (totals[b.currency] ?? 0) + b.amount
  return { label, count: bills.length, totals }
}

function byDueAsc(a: Bill, b: Bill): number {
  if (!a.due_date && !b.due_date) return 0
  if (!a.due_date) return 1
  if (!b.due_date) return -1
  return a.due_date.localeCompare(b.due_date)
}

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border">
        <div className="h-12 border-b bg-muted/20" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="ml-auto h-5 w-14 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function BillsPage() {
  const { orgId, org } = useAuth()
  const orgCurrency = org?.base_currency ?? "KES"
  const { formatDate } = useFormatDate()
  const { removeBill } = useBillActions()

  const [tab, setTab] = useState<Tab>("unpaid")
  const [search, setSearch] = useState("")
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Bill | null>(null)
  const [deleting, setDeleting] = useState<Bill | null>(null)

  const { data: bills = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["bills", orgId],
    queryFn: () => listBills(orgId!),
    enabled: !!orgId,
  })

  // ── Filters (URL-backed, applied to the loaded list) ─────────────────────
  const [searchParams, setSearchParams] = useSearchParams()
  const filtersParam = searchParams.get("filters")
  const filtersState = useMemo(() => deserializeFilters(filtersParam), [filtersParam])

  function setFiltersState(next: FiltersState) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next.length === 0) params.delete("filters")
        else params.set("filters", serializeFilters(next))
        return params
      },
      { replace: true },
    )
  }

  const currencies = useMemo(() => [...new Set(bills.map((b) => b.currency))].sort(), [bills])
  const columnsConfig = useMemo(() => createBillColumnsConfig(currencies), [currencies])
  const { columns, filters, actions, strategy } = useDataTableFilters({
    strategy: "server",
    columnsConfig,
    filters: filtersState,
    onFiltersChange: setFiltersState,
    entityName: "Bill",
  })

  const stats = useMemo(() => {
    const unpaid = bills.filter((b) => b.status === "unpaid")
    const overdue = unpaid.filter(isBillOverdue)
    const dueSoon = unpaid.filter((b) => {
      if (!b.due_date) return false
      const d = daysFromToday(b.due_date)
      return d >= 0 && d <= 7
    })
    return {
      unpaid: buildStat("Unpaid", unpaid),
      overdue: buildStat("Overdue", overdue),
      dueSoon: buildStat("Due in the next 7 days", dueSoon),
    }
  }, [bills])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = bills.filter((b) => {
      if (tab === "unpaid" && b.status !== "unpaid") return false
      if (tab === "paid" && b.status !== "paid") return false
      if (!billMatchesFilters(b, filtersState)) return false
      if (!q) return true
      return (
        b.vendor_name.toLowerCase().includes(q) ||
        (b.bill_number ?? "").toLowerCase().includes(q) ||
        (b.note ?? "").toLowerCase().includes(q)
      )
    })
    if (tab === "unpaid") rows = [...rows].sort(byDueAsc)
    else if (tab === "paid") rows = [...rows].sort((a, b) => (b.paid_at ?? "").localeCompare(a.paid_at ?? ""))
    return rows
  }, [bills, tab, search, filtersState])

  // Derived from the live list so the sheet reflects mutations immediately.
  const viewing = viewingId ? (bills.find((b) => b.id === viewingId) ?? null) : null

  // ?open=<id> comes from global search: open that bill's panel, then drop the
  // param so a reload doesn't reopen it.
  const openId = searchParams.get("open")
  useEffect(() => {
    if (!openId) return
    setViewingId(openId)
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.delete("open")
        return params
      },
      { replace: true },
    )
  }, [openId, setSearchParams])

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(bill: Bill) {
    setEditing(bill)
    setFormOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <SkeletonRows />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <ErrorState onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <BillStats {...stats} orgCurrency={orgCurrency} />

      <Filter.Provider columns={columns} filters={filters} actions={actions} strategy={strategy} entityName="Bill">
        <div className="flex flex-col gap-2">
          {/* Row 1: search + filter, tabs, add */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
              <div className="relative min-w-0 flex-1 md:flex-none">
                <Search01Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search or filter bills…"
                  className={cn("h-10 w-full pl-8 text-xs md:w-80", search ? "pr-14" : "pr-9")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors fine-hover:text-foreground"
                  >
                    <Cancel01Icon size={13} />
                  </button>
                )}
                <Filter.Menu>
                  <button
                    type="button"
                    aria-label="Filter bills"
                    className={cn(
                      "absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors",
                      filtersState.length > 0 ? "text-primary" : "text-muted-foreground fine-hover:text-foreground",
                    )}
                  >
                    <FilterIcon size={13} />
                    {filtersState.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                </Filter.Menu>
              </div>
              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
                <TabsList>
                  <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
                  <TabsTrigger value="paid">Paid</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Button className="h-10 shrink-0 gap-1.5" onClick={openAdd} aria-label="Add bill">
              <PlusSignIcon size={14} />
              <span className="hidden sm:inline">Add bill</span>
            </Button>
          </div>

          {/* Row 2: active filter chips */}
          {filtersState.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Filter.List>
                {({ filter, column }) => (
                  <Filter.Item filter={filter} column={column}>
                    <Filter.Subject />
                    <Filter.Operator />
                    <Filter.Value />
                    <Filter.Remove />
                  </Filter.Item>
                )}
              </Filter.List>
              <Filter.Actions />
            </div>
          )}
        </div>
      </Filter.Provider>

      {bills.length === 0 ? (
        <EmptyState
          icon={ReceiptTextIcon}
          title="No bills yet"
          description="Supplier invoices you forward to your inbox show up here automatically, with their due dates."
          action={<Button onClick={openAdd}>Add bill</Button>}
        />
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-xs text-muted-foreground">No bills match.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-12 px-4 text-xs">Vendor</TableHead>
                <TableHead className="h-12 px-4 text-xs">Bill no.</TableHead>
                <TableHead className="h-12 px-4 text-xs">Due date</TableHead>
                <TableHead className="h-12 px-4 text-xs">Amount</TableHead>
                <TableHead className="h-12 px-4 text-xs">Status</TableHead>
                <TableHead className="h-12 w-12 px-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((bill) => {
                const helper = billDueHelper(bill)
                return (
                  <TableRow
                    key={bill.id}
                    className="cursor-pointer transition-opacity active:opacity-80"
                    onClick={() => setViewingId(bill.id)}
                  >
                    <TableCell className="py-3 text-xs font-medium">{bill.vendor_name}</TableCell>
                    <TableCell className="py-3 font-mono text-xs">{bill.bill_number ?? "—"}</TableCell>
                    <TableCell className="py-3 text-xs">
                      {bill.due_date ? formatDate(bill.due_date) : "—"}
                      {helper && <p className="mt-0.5 text-muted-foreground">{helper}</p>}
                    </TableCell>
                    <TableCell className="py-3 text-xs font-medium">
                      {formatCurrency(bill.amount, bill.currency)}
                    </TableCell>
                    <TableCell className="py-3">
                      <BillStatusBadge status={billDisplayStatus(bill)} />
                    </TableCell>
                    <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                      <BillActions bill={bill} onEdit={openEdit} onDelete={setDeleting} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <BillDetailSheet
        bill={viewing}
        onOpenChange={(open) => !open && setViewingId(null)}
        onEdit={(b) => {
          setViewingId(null)
          openEdit(b)
        }}
        onDelete={setDeleting}
      />
      <BillFormSheet open={formOpen} onOpenChange={setFormOpen} bill={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bill?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.vendor_name} will be removed from your bills. The original document stays in your inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleting) {
                  removeBill(deleting)
                  if (viewingId === deleting.id) setViewingId(null)
                }
                setDeleting(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
