import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useDataTableFilters } from "@bazza-ui/filters";
import type { FiltersState } from "@bazza-ui/filters";
import { Search01Icon, Cancel01Icon, FilterIcon, ColumnsThreeCogIcon } from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import { cn } from "@travada-books/ui/lib/utils";
import { Spinner } from "@/components/shared/spinner";
import { ErrorState } from "@/components/shared/error-state";
import { Filter } from "@/components/ui/filter";
import { InvoiceStats } from "@/components/invoices/invoice-stats";
import { InvoiceTable, type Invoice } from "@/components/invoices/invoice-table";
import { QuotePreviewSheet } from "@/components/quotes/quote-preview-sheet";
import { createInvoiceColumnsConfig } from "@/components/invoices/invoice-filter-columns";
import type { VisibilityState } from "@tanstack/react-table";
import {
  listInvoices,
  getInvoiceSummary,
  type InvoiceFilters,
} from "@/lib/queries/invoices";
import { listCustomers } from "@/lib/queries/customers";
import { parseInvoiceFilters } from "@/lib/queries/ai";
import { useAuth } from "@/contexts/auth-context";
import { useFormatDate } from "@/hooks/use-format-date";

const PAGE_SIZE = 50;

const HIDEABLE_COLUMNS: { id: string; label: string }[] = [
  { id: "status", label: "Status" },
  { id: "issueDate", label: "Issue Date" },
  { id: "dueDate", label: "Due Date" },
  { id: "amount", label: "Amount" },
  { id: "recurring", label: "Recurring" },
  { id: "quoteNumber", label: "Quote" },
];

// ── URL filter state serialization ───────────────────────────────────────────

function serializeFilters(state: FiltersState): string {
  return JSON.stringify(
    state.map((f) => ({
      ...f,
      values: f.values.map((v) => (v instanceof Date ? v.toISOString() : v)),
    })),
  );
}

function deserializeFilters(param: string | null): FiltersState {
  if (!param) return [];
  try {
    const parsed = JSON.parse(param) as Array<{
      columnId: string;
      type: string;
      operator: string;
      values: unknown[];
    }>;
    return parsed.map((f) => ({
      ...f,
      values:
        f.type === "date" || f.columnId === "issueDate" || f.columnId === "dueDate"
          ? f.values.map((v) => (typeof v === "string" ? new Date(v) : v))
          : f.values,
    })) as FiltersState;
  } catch {
    return [];
  }
}

// ── FiltersState → InvoiceFilters translation ─────────────────────────────────

function toISODate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().split("T")[0];
  if (typeof v === "string") return v.split("T")[0];
  return "";
}

function translateFilters(state: FiltersState, search?: string): InvoiceFilters {
  const out: InvoiceFilters = {};

  if (search) out.search = search;

  for (const { columnId, operator, values } of state) {
    switch (columnId) {
      case "issueDate": {
        const v0 = values[0];
        const v1 = values[1];
        if (operator === "is between" && v0 && v1) {
          out.dateFrom = toISODate(v0);
          out.dateTo = toISODate(v1);
        } else if (operator === "is" && v0) {
          out.dateFrom = toISODate(v0);
          out.dateTo = toISODate(v0);
        } else if ((operator === "is after" || operator === "is on or after") && v0) {
          out.dateFrom = toISODate(v0);
        } else if ((operator === "is before" || operator === "is on or before") && v0) {
          out.dateTo = toISODate(v0);
        }
        break;
      }

      case "dueDate": {
        const v0 = values[0];
        const v1 = values[1];
        if (operator === "is between" && v0 && v1) {
          out.dueDateFrom = toISODate(v0);
          out.dueDateTo = toISODate(v1);
        } else if (operator === "is" && v0) {
          out.dueDateFrom = toISODate(v0);
          out.dueDateTo = toISODate(v0);
        } else if ((operator === "is after" || operator === "is on or after") && v0) {
          out.dueDateFrom = toISODate(v0);
        } else if ((operator === "is before" || operator === "is on or before") && v0) {
          out.dueDateTo = toISODate(v0);
        }
        break;
      }

      case "amount": {
        const v0 = Number(values[0]);
        const v1 = Number(values[1]);
        if (operator === "is between" && !isNaN(v0) && !isNaN(v1)) {
          out.amountMin = v0;
          out.amountMax = v1;
        } else if (operator === "is" && !isNaN(v0)) {
          out.amountMin = v0;
          out.amountMax = v0;
        } else if (
          (operator === "is greater than" || operator === "is greater than or equal to") &&
          !isNaN(v0)
        ) {
          out.amountMin = v0;
        } else if (
          (operator === "is less than" || operator === "is less than or equal to") &&
          !isNaN(v0)
        ) {
          out.amountMax = v0;
        }
        break;
      }

      case "status":
        if (values.length) out.statuses = values as string[];
        break;

      case "customer":
        if (values.length) out.customerIds = values as string[];
        break;

      case "recurring":
        out.recurring = Boolean(values[0]);
        break;
    }
  }

  return out;
}

// ── Row mapper ────────────────────────────────────────────────────────────────

type DbInvoice = Awaited<ReturnType<typeof listInvoices>>["data"][number];

function toTableInvoice(inv: DbInvoice, formatDate: (v: string | null | undefined) => string): Invoice {
  const series = inv.invoice_recurring ?? null;
  return {
    id: inv.id,
    number: inv.invoice_number ?? "—",
    status: inv.status as Invoice["status"],
    customer: inv.customer_name,
    customerLogoUrl: inv.customers?.logo_url ?? null,
    amount: inv.total ?? 0,
    currency: inv.currency,
    convertedAmount: inv.converted_amount ?? null,
    baseCurrency: inv.base_currency ?? null,
    dueDate: inv.due_date ? formatDate(inv.due_date) : null,
    issueDate: inv.issue_date ? formatDate(inv.issue_date) : null,
    recurring: (inv.recurring === "recurring" ? "monthly" : inv.recurring) as Invoice["recurring"],
    token: inv.token,
    quoteNumber: inv.quotes?.quote_number ?? undefined,
    quoteId: inv.quote_id ?? undefined,
    seriesId: series?.id,
    seriesStatus: series?.status as Invoice["seriesStatus"],
    invoiceRecurring: series
      ? {
          nextScheduledAt: series.next_scheduled_at,
          endAfterCount: series.end_after_count,
          currentCount: series.current_count,
          endType: series.end_type,
        }
      : null,
  };
}

function fmtSummary(
  data: { total_amount: number; invoice_count: number; currency: string } | undefined,
  label: string,
  orgCurrency: string,
) {
  const currency = data?.currency ?? orgCurrency;
  const amount = data?.total_amount ?? 0;
  return { label, amount, currency, count: data?.invoice_count ?? 0 };
}

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-lg border bg-muted/40 animate-pulse" />
        ))}
      </div>
      <div className="rounded-lg border overflow-hidden">
        <div className="h-12 border-b bg-muted/20" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0">
            <div className="h-6 w-6 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            <div className="ml-auto h-5 w-14 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function InvoicesPage() {
  const navigate = useNavigate();
  const { orgId, org } = useAuth();
  const orgCurrency = org?.base_currency ?? "KES";
  const { formatDate } = useFormatDate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [isAIParsing, setIsAIParsing] = useState(false);
  const [page, setPage] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [previewQuoteId, setPreviewQuoteId] = useState<string | null>(null);

  // ── Filter state (URL-backed) ─────────────────────────────────────────────
  const filtersState = deserializeFilters(searchParams.get("filters"));

  function setFiltersState(next: FiltersState) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next.length === 0) {
          params.delete("filters");
        } else {
          params.set("filters", serializeFilters(next));
        }
        return params;
      },
      { replace: true },
    );
    setPage(0);
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: () => listCustomers(orgId!),
    enabled: !!orgId,
  });

  const columnsConfig = useMemo(
    () => createInvoiceColumnsConfig(customers.map((c) => ({ id: c.id, name: c.name }))),
    [customers],
  );

  const { columns, filters, actions, strategy } = useDataTableFilters({
    strategy: "server",
    columnsConfig,
    filters: filtersState,
    onFiltersChange: setFiltersState,
    entityName: "Invoice",
  });

  const supabaseFilters = useMemo(
    () => translateFilters(filtersState, search || undefined),
    [filtersState, search],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["invoices", orgId, supabaseFilters, page],
    queryFn: () => listInvoices(orgId!, supabaseFilters, page),
    enabled: !!orgId,
    placeholderData: (prev) => prev,
  });

  const { data: openSummary } = useQuery({
    queryKey: ["invoice-summary", orgId, "open"],
    queryFn: () => getInvoiceSummary(orgId!, ["draft", "unpaid"]),
    enabled: !!orgId,
  });
  const { data: overdueSummary } = useQuery({
    queryKey: ["invoice-summary", orgId, "overdue"],
    queryFn: () => getInvoiceSummary(orgId!, ["overdue"]),
    enabled: !!orgId,
  });
  const { data: paidSummary } = useQuery({
    queryKey: ["invoice-summary", orgId, "paid"],
    queryFn: () => getInvoiceSummary(orgId!, ["paid"]),
    enabled: !!orgId,
  });

  const stats = {
    open: fmtSummary(openSummary, "Open", orgCurrency),
    overdue: fmtSummary(overdueSummary, "Overdue", orgCurrency),
    paid: fmtSummary(paidSummary, "Paid", orgCurrency),
  };

  const invoices = useMemo(
    () => (data?.data ?? []).map((inv) => toTableInvoice(inv, formatDate)),
    [data, formatDate],
  );
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // ── AI search ─────────────────────────────────────────────────────────────
  async function handleSearchSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      setSearch("");
      setPage(0);
      return;
    }
    if (trimmed.split(/\s+/).length === 1) {
      setSearch(trimmed);
      setPage(0);
      return;
    }

    setIsAIParsing(true);
    try {
      const customerNames = customers.map((c) => c.name);
      const parsed = await parseInvoiceFilters({
        input: trimmed,
        customers: customerNames,
        currentDate: new Date().toISOString().split("T")[0],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      setSearch(parsed.name ?? "");

      const newFilters: FiltersState = [];

      if (parsed.dateFrom && parsed.dateTo) {
        newFilters.push({
          columnId: "issueDate",
          type: "date",
          operator: "is between",
          values: [new Date(parsed.dateFrom), new Date(parsed.dateTo)],
        });
      } else if (parsed.dateFrom) {
        newFilters.push({
          columnId: "issueDate",
          type: "date",
          operator: "is on or after",
          values: [new Date(parsed.dateFrom)],
        });
      } else if (parsed.dateTo) {
        newFilters.push({
          columnId: "issueDate",
          type: "date",
          operator: "is on or before",
          values: [new Date(parsed.dateTo)],
        });
      }

      if (parsed.statuses?.length) {
        newFilters.push({
          columnId: "status",
          type: "option",
          operator: "is",
          values: parsed.statuses,
        });
      }

      if (parsed.customers?.length) {
        const matchedIds = parsed.customers
          .map((name) => customers.find((c) => c.name === name)?.id)
          .filter(Boolean) as string[];
        if (matchedIds.length) {
          newFilters.push({
            columnId: "customer",
            type: "option",
            operator: "is",
            values: matchedIds,
          });
        }
      }

      if (parsed.recurring != null) {
        newFilters.push({
          columnId: "recurring",
          type: "boolean",
          operator: "is",
          values: [parsed.recurring],
        });
      }
      if (parsed.amountMin != null && parsed.amountMax != null) {
        newFilters.push({ columnId: "amount", type: "number", operator: "is between", values: [parsed.amountMin, parsed.amountMax] });
      } else if (parsed.amountMin != null) {
        newFilters.push({ columnId: "amount", type: "number", operator: "is greater than or equal to", values: [parsed.amountMin] });
      } else if (parsed.amountMax != null) {
        newFilters.push({ columnId: "amount", type: "number", operator: "is less than or equal to", values: [parsed.amountMax] });
      }

      setFiltersState(newFilters);
      setPage(0);
    } catch {
      setSearch(trimmed);
      setPage(0);
    } finally {
      setIsAIParsing(false);
    }
  }

  function handleInputChange(val: string) {
    setInput(val);
    if (!val) {
      setSearch("");
      setPage(0);
    }
  }

  function clearSearch() {
    setInput("");
    setSearch("");
    setFiltersState([]);
    setPage(0);
    inputRef.current?.focus();
  }

  if (isLoading && !data) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <SkeletonRows />
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <InvoiceStats {...stats} />

      {/* Toolbar */}
      <Filter.Provider
        columns={columns}
        filters={filters}
        actions={actions}
        strategy={strategy}
        entityName="Invoice"
      >
        <div className="flex flex-col gap-2">
          {/* Row 1: search + filter + actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearchSubmit} className="relative">
                {isAIParsing ? (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Spinner size={14} />
                  </span>
                ) : (
                  <Search01Icon
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                )}
                <Input
                  ref={inputRef}
                  placeholder="Search or filter invoices…"
                  className={cn(
                    "h-10 w-80 pl-8 text-xs",
                    (input || search) ? "pr-14" : "pr-9",
                  )}
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={isAIParsing}
                />
                {(input || search) && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground fine-hover:text-foreground transition-colors"
                  >
                    <Cancel01Icon size={13} />
                  </button>
                )}
                <Filter.Menu>
                  <button
                    type="button"
                    className={cn(
                      "absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors",
                      filtersState.length > 0
                        ? "text-primary"
                        : "text-muted-foreground fine-hover:text-foreground",
                    )}
                  >
                    <FilterIcon size={13} />
                    {filtersState.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                </Filter.Menu>
              </form>

              {/* Columns toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 gap-1.5 text-xs">
                    <ColumnsThreeCogIcon size={14} />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  {HIDEABLE_COLUMNS.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      checked={columnVisibility[col.id] !== false}
                      onCheckedChange={(checked) =>
                        setColumnVisibility((prev) => ({ ...prev, [col.id]: checked }))
                      }
                      className="text-xs"
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button className="h-10" onClick={() => navigate("/invoices/create")}>
              + New Invoice
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
              <div
                className="contents"
                onClick={() => { setInput(""); setSearch(""); setPage(0); }}
              >
                <Filter.Actions />
              </div>
            </div>
          )}
        </div>
      </Filter.Provider>

      <InvoiceTable
        data={invoices}
        globalFilter={search}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        onQuoteClick={(quoteId) => setPreviewQuoteId(quoteId)}
      />

      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {totalCount} invoice{totalCount !== 1 ? "s" : ""}
            {totalPages > 1 && ` · Page ${page + 1} of ${totalPages}`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <QuotePreviewSheet
        quoteId={previewQuoteId}
        onOpenChange={(open) => { if (!open) setPreviewQuoteId(null); }}
      />
    </div>
  );
}
