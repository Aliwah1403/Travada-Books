import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useSearchParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { useDataTableFilters, type FiltersState } from "@bazza-ui/filters"
import type { VisibilityState } from "@tanstack/react-table"
import { Search01Icon, Cancel01Icon, ReceiptTextIcon, PlusSignIcon, FilterIcon, ColumnsThreeCogIcon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu"
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
import { billMatchesFilters, createBillColumnsConfig, filtersFromParsed, FILTER_ROWS } from "@/components/bills/bill-filter-columns"
import { Spinner } from "@/components/shared/spinner"
import { parseBillFilters } from "@/lib/queries/ai"
import { toDateOnlyString } from "@/lib/format-date"
import { BILL_DEFAULT_HIDDEN, BILL_HIDEABLE_COLUMNS, BillTable } from "@/components/bills/bill-table"
import { BillFormSheet } from "@/components/bills/bill-form-sheet"
import { BillDetailSheet } from "@/components/bills/bill-detail-sheet"
import { useBillActions } from "@/components/bills/use-bill-actions"
import { useAuth } from "@/contexts/auth-context"
import { useFormatDate } from "@/hooks/use-format-date"
import { daysFromToday, isBillOverdue, listBills, type Bill } from "@/lib/queries/bills"

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

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(BILL_DEFAULT_HIDDEN)
  // `input` is what's typed; `search` is the text the list is filtered by. A
  // single word filters as you type; a sentence waits for Enter and goes
  // through parse-bill-filters, like the Invoices and Transactions search.
  const [input, setInput] = useState("")
  const [search, setSearch] = useState("")
  const [isAIParsing, setIsAIParsing] = useState(false)
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
    data: FILTER_ROWS,
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

  // Filters and search only; the table does the sorting.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bills.filter((b) => {
      if (!billMatchesFilters(b, filtersState)) return false
      if (!q) return true
      return (
        b.vendor_name.toLowerCase().includes(q) ||
        (b.bill_number ?? "").toLowerCase().includes(q) ||
        (b.note ?? "").toLowerCase().includes(q)
      )
    })
  }, [bills, search, filtersState])

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

  function handleInputChange(value: string) {
    setInput(value)
    if (!/\s/.test(value.trim())) setSearch(value)
  }

  function clearSearch() {
    setInput("")
    setSearch("")
    setFiltersState([])
  }

  async function handleSearchSubmit(e?: FormEvent) {
    e?.preventDefault()
    const trimmed = input.trim()
    if (trimmed.split(/\s+/).length < 2) {
      setSearch(trimmed)
      return
    }
    setIsAIParsing(true)
    try {
      const vendors = [...new Set(bills.map((b) => b.vendor_name))]
      const parsed = await parseBillFilters({
        input: trimmed,
        vendors,
        currentDate: toDateOnlyString(new Date()), // the user's calendar day, not UTC's
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      setSearch(parsed.name ?? "")
      setInput(parsed.name ?? "")
      setFiltersState(filtersFromParsed(parsed))
    } catch {
      // The parser is a convenience: fall back to plain text search.
      setSearch(trimmed)
    } finally {
      setIsAIParsing(false)
    }
  }

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
              <form onSubmit={handleSearchSubmit} className="relative min-w-0 flex-1 md:flex-none">
                {isAIParsing ? (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Spinner size={14} />
                  </span>
                ) : (
                  <Search01Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  placeholder="Search or filter bills…"
                  className={cn("h-10 w-full pl-8 text-xs md:w-80", input || search ? "pr-14" : "pr-9")}
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isAIParsing}
                />
                {(input || search) && (
                  <button
                    type="button"
                    onClick={clearSearch}
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
              </form>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" className="hidden h-10 gap-1.5 text-xs md:inline-flex" />}
                >
                  <ColumnsThreeCogIcon size={14} />
                  Columns
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  {BILL_HIDEABLE_COLUMNS.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      checked={columnVisibility[col.id] !== false}
                      onCheckedChange={(checked) => setColumnVisibility((prev) => ({ ...prev, [col.id]: checked }))}
                      className="text-xs"
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
        <BillTable
          data={visible}
          formatDate={formatDate}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          onView={(b) => setViewingId(b.id)}
          onEdit={openEdit}
          onDelete={setDeleting}
        />
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
