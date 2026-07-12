import { useMemo, useRef, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataTableFilters } from "@bazza-ui/filters";
import type { FiltersState } from "@bazza-ui/filters";
import type { VisibilityState } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import { Search01Icon, Cancel01Icon, ColumnsThreeCogIcon, FilterIcon } from "@travada-books/ui/icons";
import { cn } from "@travada-books/ui/lib/utils";
import { Spinner } from "@/components/shared/spinner";
import { ErrorState } from "@/components/shared/error-state";
import { Filter } from "@/components/ui/filter";
import { TransactionStats } from "@/components/transactions/transaction-stats";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionSheet } from "@/components/transactions/transaction-sheet";
import { ImportCsvDialog } from "@/components/transactions/import-csv-dialog";
import { ExportTransactionsDialog } from "@/components/transactions/export-transactions-dialog";
import { createTransactionColumnsConfig } from "@/components/transactions/transaction-filter-columns";
import {
  DEFAULT_HIDDEN_COLUMNS,
  type Transaction as UITransaction,
} from "@/components/transactions/transaction-columns";
import {
  listTransactions,
  listTransactionCategories,
  deleteTransaction,
  bulkDeleteTransactions,
  bulkUpdateTransactions,
  getTransactionSummary,
  getTransactionExport,
  triggerTransactionExport,
  type Transaction as DbTransaction,
  type TransactionFilters,
  type BulkTransactionUpdate,
} from "@/lib/queries/transactions";
import { getDocumentSignedUrl } from "@/lib/queries/vault";
import { parseTransactionFilters } from "@/lib/queries/ai";
import { useAuth } from "@/contexts/auth-context";
import { useFormatDate } from "@/hooks/use-format-date";

const PAGE_SIZE = 50;

const HIDEABLE_COLUMNS: { id: string; label: string }[] = [
  { id: "date", label: "Date" },
  { id: "name", label: "Description" },
  { id: "counterpartyName", label: "To / From" },
  { id: "categoryName", label: "Category" },
  { id: "paymentMode", label: "Payment" },
  { id: "amount", label: "Amount" },
  { id: "taxAmount", label: "Tax" },
  { id: "recurring", label: "Recurring" },
  { id: "linkedInvoice", label: "Invoice" },
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
        f.type === "date" || f.columnId === "date"
          ? f.values.map((v) => (typeof v === "string" ? new Date(v) : v))
          : f.values,
    })) as FiltersState;
  } catch {
    return [];
  }
}

// ── FiltersState → TransactionFilters translation ────────────────────────────

function toISODate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().split("T")[0];
  if (typeof v === "string") return v.split("T")[0];
  return "";
}

function translateFilters(state: FiltersState, search?: string): TransactionFilters {
  const out: TransactionFilters = {};

  if (search) out.search = search;

  for (const { columnId, operator, values } of state) {
    switch (columnId) {
      case "date": {
        const v0 = values[0];
        const v1 = values[1];
        if (operator === "is between" && v0 && v1) {
          out.dateFrom = toISODate(v0);
          out.dateTo = toISODate(v1);
        } else if (operator === "is" && v0) {
          out.dateFrom = toISODate(v0);
          out.dateTo = toISODate(v0);
        } else if (
          (operator === "is after" || operator === "is on or after") &&
          v0
        ) {
          out.dateFrom = toISODate(v0);
        } else if (
          (operator === "is before" || operator === "is on or before") &&
          v0
        ) {
          out.dateTo = toISODate(v0);
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
          (operator === "is greater than" ||
            operator === "is greater than or equal to") &&
          !isNaN(v0)
        ) {
          out.amountMin = v0;
        } else if (
          (operator === "is less than" ||
            operator === "is less than or equal to") &&
          !isNaN(v0)
        ) {
          out.amountMax = v0;
        }
        break;
      }

      case "type":
        if (values[0]) out.type = values[0] as "income" | "expense";
        break;

      case "status":
        if (values.length) out.statuses = values as string[];
        break;

      case "category":
        if (values.length) out.categoryIds = values as string[];
        break;

      case "paymentMode":
        if (values.length) out.paymentModes = values as string[];
        break;

      case "recurring":
        out.recurring = Boolean(values[0]);
        break;

      case "hasAttachment":
        out.hasAttachments = Boolean(values[0]);
        break;
    }
  }

  return out;
}

// ── Row mapper ───────────────────────────────────────────────────────────────

function mapDbTx(row: DbTransaction): UITransaction {
  return {
    id: row.id,
    date: row.date ? row.date.slice(0, 10) : "",
    name: row.name,
    counterpartyName: row.counterparty_name,
    customerId: row.customer_id,
    type: row.type,
    amount: row.amount,
    taxAmount: row.tax_amount,
    taxRate: row.tax_rate,
    taxType: row.tax_type,
    categoryId: row.category?.id ?? null,
    categoryName: row.category?.name ?? null,
    categoryColor: row.category?.color ?? null,
    currency: row.currency,
    status: row.status,
    paymentMode: row.payment_mode,
    recurring: row.recurring,
    frequency: row.frequency,
    internal: row.internal,
    referenceNumber: row.reference_number,
    note: row.note,
    linkedInvoiceId: row.invoice_id,
    linkedInvoiceNumber: row.invoice?.invoice_number ?? null,
    hasAttachments: (row.attachments?.length ?? 0) > 0,
    attachments: row.attachments ?? [],
    enrichmentCompleted: row.enrichment_completed,
  };
}

function SkeletonRows() {
  return (
    <div className="rounded-lg border overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b last:border-0"
        >
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          <div className="h-3 flex-1 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function TransactionsPage() {
  const { orgId, org, profile } = useAuth();
  const { formatDate } = useFormatDate();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [isAIParsing, setIsAIParsing] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_HIDDEN_COLUMNS);
  const [page, setPage] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportingIds, setExportingIds] = useState<string[]>([]);
  const [exportId, setExportId] = useState<string | null>(null);
  const [isExportLoading, setIsExportLoading] = useState(false);

  // ── Filter state (URL-backed) ──────────────────────────────────────────────
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

  const { data: categories } = useQuery({
    queryKey: ["transaction-categories", orgId],
    queryFn: () => listTransactionCategories(orgId!),
    enabled: !!orgId,
  });

  const columnsConfig = useMemo(
    () => createTransactionColumnsConfig(categories ?? []),
    [categories],
  );

  const { columns, filters, actions, strategy } = useDataTableFilters({
    strategy: "server",
    columnsConfig,
    filters: filtersState,
    onFiltersChange: setFiltersState,
    entityName: "Transaction",
  });

  const supabaseFilters = useMemo(
    () => translateFilters(filtersState, search || undefined),
    [filtersState, search],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["transactions", orgId, supabaseFilters, page],
    queryFn: () => listTransactions(orgId!, supabaseFilters, page),
    enabled: !!orgId,
    placeholderData: (prev) => prev,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["transaction-summary", orgId, supabaseFilters],
    queryFn: () => getTransactionSummary(orgId!, org!.base_currency, supabaseFilters),
    enabled: !!orgId && !!org?.base_currency,
    placeholderData: (prev) => prev,
  });

  const transactions = useMemo(
    () => (data?.data ?? []).map(mapDbTx),
    [data],
  );
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const editingTransaction =
    editingId ? (transactions.find((t) => t.id === editingId) ?? null) : null;

  function invalidateTransactions() {
    queryClient.invalidateQueries({ queryKey: ["transactions", orgId] });
    queryClient.invalidateQueries({ queryKey: ["transaction-summary", orgId] });
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id, orgId!),
    onSuccess: invalidateTransactions,
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteTransactions(ids, orgId!),
    onSuccess: invalidateTransactions,
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, update }: { ids: string[]; update: BulkTransactionUpdate }) =>
      bulkUpdateTransactions(ids, orgId!, update),
    onSuccess: invalidateTransactions,
  });

  async function handleSearchSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      setSearch("");
      setPage(0);
      return;
    }
    const words = trimmed.split(/\s+/);
    if (words.length === 1) {
      setSearch(trimmed);
      setPage(0);
      return;
    }
    setIsAIParsing(true);
    try {
      const categoryNames = categories?.map((c) => c.name) ?? [];
      const parsed = await parseTransactionFilters({
        input: trimmed,
        categories: categoryNames,
        currentDate: new Date().toISOString().split("T")[0],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setSearch(parsed.name ?? "");

      // Build FiltersState directly with correct operators — bypassing
      // actions.setFilterValue which doesn't let us specify the operator.
      const categoryId = parsed.categoryName
        ? (categories?.find((c) => c.name === parsed.categoryName)?.id ?? undefined)
        : undefined;

      const newFilters: FiltersState = [];

      if (parsed.dateFrom && parsed.dateTo) {
        newFilters.push({
          columnId: "date",
          type: "date",
          operator: "is between",
          values: [new Date(parsed.dateFrom), new Date(parsed.dateTo)],
        });
      } else if (parsed.dateFrom) {
        newFilters.push({
          columnId: "date",
          type: "date",
          operator: "is on or after",
          values: [new Date(parsed.dateFrom)],
        });
      } else if (parsed.dateTo) {
        newFilters.push({
          columnId: "date",
          type: "date",
          operator: "is on or before",
          values: [new Date(parsed.dateTo)],
        });
      }
      if (parsed.type) {
        newFilters.push({ columnId: "type", type: "option", operator: "is", values: [parsed.type] });
      }
      if (parsed.status) {
        newFilters.push({ columnId: "status", type: "option", operator: "is", values: [parsed.status] });
      }
      if (categoryId) {
        newFilters.push({ columnId: "category", type: "option", operator: "is", values: [categoryId] });
      }
      if (parsed.paymentMode) {
        newFilters.push({ columnId: "paymentMode", type: "option", operator: "is", values: [parsed.paymentMode] });
      }
      if (parsed.recurring != null) {
        newFilters.push({ columnId: "recurring", type: "boolean", operator: "is", values: [parsed.recurring] });
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

  function handleEdit(id: string) {
    setEditingId(id);
    setSheetOpen(true);
  }

  function handleDelete(id: string) {
    toast.promise(deleteMutation.mutateAsync(id), {
      loading: "Deleting transaction…",
      success: "Transaction deleted",
      error: "Failed to delete transaction",
    });
  }

  function handleBulkDelete(ids: string[]) {
    toast.promise(bulkDeleteMutation.mutateAsync(ids), {
      loading: `Deleting ${ids.length} transaction${ids.length !== 1 ? "s" : ""}…`,
      success: `${ids.length} transaction${ids.length !== 1 ? "s" : ""} deleted`,
      error: "Failed to delete transactions",
    });
  }

  function handleBulkUpdate(ids: string[], update: BulkTransactionUpdate) {
    toast.promise(bulkUpdateMutation.mutateAsync({ ids, update }), {
      loading: `Updating ${ids.length} transaction${ids.length !== 1 ? "s" : ""}…`,
      success: `${ids.length} transaction${ids.length !== 1 ? "s" : ""} updated`,
      error: "Failed to update transactions",
    });
  }

  function handleNewTransaction() {
    setEditingId(null);
    setSheetOpen(true);
  }

  // ── Export polling ─────────────────────────────────────────────────────────
  const { data: exportRecord } = useQuery({
    queryKey: ["transaction-export", exportId],
    queryFn: () => getTransactionExport(exportId!),
    enabled: !!exportId,
    refetchInterval: (query) =>
      query.state.data?.status === "processing" ? 1500 : false,
  });

  useEffect(() => {
    if (!exportRecord) return;
    if (exportRecord.status === "completed" && exportRecord.file_path) {
      getDocumentSignedUrl(exportRecord.file_path).then((url) => {
        const filename =
          exportRecord.file_path!.split("/").pop() ?? "transactions-export";
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
      toast.success(
        `Exported ${exportRecord.row_count ?? exportingIds.length} transaction${(exportRecord.row_count ?? 1) !== 1 ? "s" : ""}`,
        {
          id: "export",
          action: {
            label: "Download again",
            onClick: () => {
              if (exportRecord.file_path) {
                getDocumentSignedUrl(exportRecord.file_path).then((url) => {
                  const a = document.createElement("a");
                  a.href = url;
                  a.download =
                    exportRecord.file_path!.split("/").pop() ?? "export";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                });
              }
            },
          },
        },
      );
      setExportId(null);
    }
    if (exportRecord.status === "failed") {
      toast.error("Export failed. Please try again.", {
        id: "export",
      });
      setExportId(null);
    }
  }, [exportRecord?.status]);

  async function handleExport(format: "csv" | "xlsx", emailTo?: string) {
    setIsExportLoading(true);
    try {
      const { exportId: id } = await triggerTransactionExport({
        transactionIds: exportingIds,
        format,
        emailTo,
      });
      setExportId(id);
      setExportDialogOpen(false);
      toast.loading(
        `Generating export for ${exportingIds.length} transaction${exportingIds.length !== 1 ? "s" : ""}…`,
        { id: "export" },
      );
    } catch (err) {
      toast.error("Failed to start export. Please try again.");
    } finally {
      setIsExportLoading(false);
    }
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
      <TransactionStats
        income={summary?.income ?? 0}
        expenses={summary?.expenses ?? 0}
        currency={org?.base_currency ?? "KES"}
        count={summary?.count}
        isLoading={summaryLoading}
      />

      {/* Toolbar */}
      <Filter.Provider
        columns={columns}
        filters={filters}
        actions={actions}
        strategy={strategy}
        entityName="Transaction"
      >
        <div className="flex flex-col gap-2">
          {/* Row 1: controls + actions — always stable, never wraps */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Search */}
              <form onSubmit={handleSearchSubmit} className="relative">
                {isAIParsing ?
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Spinner size={14} />
                  </span>
                : <Search01Icon
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                }
                <Input
                  ref={inputRef}
                  placeholder="Search or filter transactions…"
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
                {/* Filter trigger embedded inside the input */}
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

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-10"
                onClick={() => setImportOpen(true)}
              >
                Import
              </Button>
              <Button className="h-10" onClick={handleNewTransaction}>
                + New Transaction
              </Button>
            </div>
          </div>

          {/* Row 2: active filter chips — only shown when filters are active */}
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

      {isLoading ?
        <SkeletonRows />
      : <TransactionTable
          data={transactions}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkUpdate={handleBulkUpdate}
          onBulkExport={(ids) => {
            setExportingIds(ids);
            setExportDialogOpen(true);
          }}
          categories={categories ?? []}
          formatDate={formatDate}
        />
      }

      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {totalCount} transaction{totalCount !== 1 ? "s" : ""}
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

      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />

      <ExportTransactionsDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        selectedCount={exportingIds.length}
        defaultEmail={profile?.email ?? undefined}
        onExport={handleExport}
        isLoading={isExportLoading}
      />

      <TransactionSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setEditingId(null);
        }}
        transaction={editingTransaction}
        onSaved={invalidateTransactions}
      />
    </div>
  );
}
