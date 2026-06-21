import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Search01Icon, Cancel01Icon } from "@travada-books/ui/icons";
import { Spinner } from "@/components/shared/spinner";
import { TransactionStats } from "@/components/transactions/transaction-stats";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionSheet } from "@/components/transactions/transaction-sheet";
import { ImportCsvDialog } from "@/components/transactions/import-csv-dialog";
import { type Transaction as UITransaction } from "@/components/transactions/transaction-columns";
import {
  listTransactions,
  listTransactionCategories,
  deleteTransaction,
  bulkDeleteTransactions,
  bulkUpdateTransactions,
  getTransactionSummary,
  type Transaction as DbTransaction,
  type TransactionFilters,
  type BulkTransactionUpdate,
} from "@/lib/queries/transactions";
import { parseTransactionFilters } from "@/lib/queries/ai";
import { useAuth } from "@/contexts/auth-context";
import { useFormatDate } from "@/hooks/use-format-date";

const PAGE_SIZE = 50;

const PAYMENT_MODE_LABELS: Record<string, string> = {
  mpesa: "M-Pesa",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};

function mapDbTx(
  row: DbTransaction,
  formatDate: (v: string | null | undefined) => string,
): UITransaction {
  const dateStr = row.date ? formatDate(row.date.slice(0, 10)) : "";
  return {
    id: row.id,
    date: dateStr,
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
    <div className='rounded-lg border overflow-hidden'>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className='flex items-center gap-4 px-4 py-3 border-b last:border-0'
        >
          <div className='h-3 w-20 rounded bg-muted animate-pulse' />
          <div className='h-3 flex-1 rounded bg-muted animate-pulse' />
          <div className='h-3 w-24 rounded bg-muted animate-pulse' />
          <div className='h-3 w-16 rounded bg-muted animate-pulse' />
          <div className='h-3 w-20 rounded bg-muted animate-pulse' />
        </div>
      ))}
    </div>
  );
}

type ActiveFilter = {
  key: string;
  label: string;
};

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className='inline-flex items-center gap-1  border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground'>
      {label}
      <button
        type='button'
        onClick={onRemove}
        className='fine-hover:text-foreground transition-colors'
      >
        <Cancel01Icon size={11} />
      </button>
    </span>
  );
}

export function TransactionsPage() {
  const { orgId, org } = useAuth();
  const { formatDate } = useFormatDate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState("");
  const [filters, setFilters] = useState<TransactionFilters>({});
  // Display name for category chip (AI returns name, not ID)
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(
    null,
  );
  const [isAIParsing, setIsAIParsing] = useState(false);
  const [page, setPage] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["transaction-categories", orgId],
    queryFn: () => listTransactionCategories(orgId!),
    enabled: !!orgId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", orgId, filters, page],
    queryFn: () => listTransactions(orgId!, filters, page),
    enabled: !!orgId,
    placeholderData: (prev) => prev,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["transaction-summary", orgId, filters],
    queryFn: () => getTransactionSummary(orgId!, org!.base_currency, filters),
    enabled: !!orgId && !!org?.base_currency,
    placeholderData: (prev) => prev,
  });

  const transactions = useMemo(
    () => (data?.data ?? []).map((row) => mapDbTx(row, formatDate)),
    [data, formatDate],
  );
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id, orgId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", orgId] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteTransactions(ids, orgId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", orgId] });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({
      ids,
      update,
    }: {
      ids: string[];
      update: BulkTransactionUpdate;
    }) => bulkUpdateTransactions(ids, orgId!, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", orgId] });
    },
  });

  const editingTransaction =
    editingId ? (transactions.find((t) => t.id === editingId) ?? null) : null;

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      clearAll();
      return;
    }

    const words = trimmed.split(/\s+/);
    if (words.length === 1) {
      // Single word — straight FTS
      setFilters({ search: trimmed });
      setActiveCategoryName(null);
      setPage(0);
      return;
    }

    // Multi-word — parse with AI
    setIsAIParsing(true);
    try {
      const categoryNames = categories?.map((c) => c.name) ?? [];
      const parsed = await parseTransactionFilters({
        input: trimmed,
        categories: categoryNames,
        currentDate: new Date().toISOString().split("T")[0],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      const categoryId =
        parsed.categoryName ?
          (categories?.find((c) => c.name === parsed.categoryName)?.id ??
          undefined)
        : undefined;

      setFilters({
        search: parsed.name ?? undefined,
        dateFrom: parsed.dateFrom ?? undefined,
        dateTo: parsed.dateTo ?? undefined,
        type: parsed.type ?? undefined,
        status: parsed.status ?? undefined,
        categoryIds: categoryId ? [categoryId] : undefined,
        paymentMode: parsed.paymentMode ?? undefined,
        recurring: parsed.recurring ?? undefined,
      });
      setActiveCategoryName(parsed.categoryName ?? null);
      setPage(0);
    } catch {
      // Fall back to plain FTS if AI fails
      setFilters({ search: trimmed });
      setActiveCategoryName(null);
      setPage(0);
    } finally {
      setIsAIParsing(false);
    }
  }

  function handleInputChange(val: string) {
    setInput(val);
    if (!val) clearAll();
  }

  function clearAll() {
    setInput("");
    setFilters({});
    setActiveCategoryName(null);
    setPage(0);
    inputRef.current?.focus();
  }

  function removeFilter(key: keyof TransactionFilters) {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (key === "categoryIds") setActiveCategoryName(null);
    setPage(0);
  }

  // Build display chips for all active non-search filters
  const activeChips = useMemo<ActiveFilter[]>(() => {
    const chips: ActiveFilter[] = [];
    if (filters.dateFrom || filters.dateTo) {
      const from =
        filters.dateFrom ? format(new Date(filters.dateFrom), "MMM d") : null;
      const to =
        filters.dateTo ? format(new Date(filters.dateTo), "MMM d") : null;
      const label =
        from && to ? `${from} – ${to}`
        : from ? `From ${from}`
        : `Until ${to}`;
      chips.push({ key: "date", label: label! });
    }
    if (filters.type) {
      chips.push({
        key: "type",
        label: filters.type === "income" ? "Income" : "Expense",
      });
    }
    if (filters.status) {
      chips.push({
        key: "status",
        label: filters.status.charAt(0).toUpperCase() + filters.status.slice(1),
      });
    }
    if (filters.categoryIds?.length && activeCategoryName) {
      chips.push({ key: "categoryIds", label: activeCategoryName });
    }
    if (filters.paymentMode) {
      chips.push({
        key: "paymentMode",
        label: PAYMENT_MODE_LABELS[filters.paymentMode] ?? filters.paymentMode,
      });
    }
    if (filters.recurring != null) {
      chips.push({
        key: "recurring",
        label: filters.recurring ? "Recurring" : "Non-recurring",
      });
    }
    return chips;
  }, [filters, activeCategoryName]);

  const hasActiveFilters = !!filters.search || activeChips.length > 0;

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

  return (
    <div className='flex flex-col gap-6 p-6'>
      <TransactionStats
        income={summary?.income ?? 0}
        expenses={summary?.expenses ?? 0}
        currency={org?.base_currency ?? "KES"}
        count={summary?.count}
        isLoading={summaryLoading}
      />
      {/* Toolbar */}
      <div className='flex items-center justify-between gap-2'>
        <div className='flex flex-col gap-2'>
          <form onSubmit={handleSubmit} className='relative'>
            {isAIParsing ?
              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'>
                <Spinner size={14} />
              </span>
            : <Search01Icon
                size={14}
                className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
              />
            }
            <Input
              ref={inputRef}
              placeholder='Search or filter transactions…'
              className='h-10 w-80 pl-8 pr-8 text-xs'
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              autoComplete='off'
              autoCapitalize='none'
              autoCorrect='off'
              spellCheck={false}
              disabled={isAIParsing}
            />
            {hasActiveFilters && (
              <button
                type='button'
                onClick={clearAll}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground fine-hover:text-foreground transition-colors'
              >
                <Cancel01Icon size={13} />
              </button>
            )}
          </form>

          {activeChips.length > 0 && (
            <div className='flex flex-wrap gap-1.5'>
              {activeChips.map((chip) => (
                <FilterChip
                  key={chip.key}
                  label={chip.label}
                  onRemove={() =>
                    removeFilter(chip.key as keyof TransactionFilters)
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            className='h-10'
            onClick={() => setImportOpen(true)}
          >
            Import
          </Button>
          <Button className='h-10' onClick={handleNewTransaction}>
            + New Transaction
          </Button>
        </div>
      </div>

      {isLoading ?
        <SkeletonRows />
      : <TransactionTable
          data={transactions}
          globalFilter={filters.search ?? ""}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkUpdate={handleBulkUpdate}
          categories={categories ?? []}
        />
      }

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className='flex items-center justify-between'>
          <span className='text-xs text-muted-foreground'>
            {totalCount} transaction{totalCount !== 1 ? "s" : ""}
            {totalPages > 1 && ` · Page ${page + 1} of ${totalPages}`}
          </span>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant='outline'
              size='sm'
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />

      <TransactionSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setEditingId(null);
        }}
        transaction={editingTransaction}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["transactions", orgId] });
        }}
      />
    </div>
  );
}
