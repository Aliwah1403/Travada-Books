import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import {
  Search01Icon,
  Cancel01Icon,
} from "@travada-books/ui/icons";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionSheet } from "@/components/transactions/transaction-sheet";
import {
  type Transaction as UITransaction,
} from "@/components/transactions/transaction-columns";
import {
  listTransactions,
  deleteTransaction,
  type Transaction as DbTransaction,
  type TransactionFilters,
} from "@/lib/queries/transactions";
import { useAuth } from "@/contexts/auth-context";

const PAGE_SIZE = 50;

function mapDbTx(row: DbTransaction): UITransaction {
  const dateStr = row.date ? row.date.slice(0, 10) : "";
  return {
    id: row.id,
    date: dateStr,
    name: row.name,
    counterpartyName: row.counterparty_name,
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
  };
}

function SkeletonRows() {
  return (
    <div className="rounded-lg border overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
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

export function TransactionsPage() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Debounce search to avoid FTS on every keystroke
  const searchRef = { current: 0 };
  function handleSearchChange(val: string) {
    setSearch(val);
    clearTimeout(searchRef.current);
    searchRef.current = window.setTimeout(() => {
      setDebouncedSearch(val);
      setPage(0);
    }, 350);
  }

  const filters: TransactionFilters = useMemo(
    () => ({ search: debouncedSearch || undefined }),
    [debouncedSearch],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", orgId, filters, page],
    queryFn: () => listTransactions(orgId!, filters, page),
    enabled: !!orgId,
    placeholderData: (prev) => prev,
  });

  const transactions = useMemo(
    () => (data?.data ?? []).map(mapDbTx),
    [data],
  );
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id, orgId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", orgId] });
    },
  });

  const editingTransaction = editingId
    ? (transactions.find((t) => t.id === editingId) ?? null)
    : null;

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

  function handleNewTransaction() {
    setEditingId(null);
    setSheetOpen(true);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search01Icon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search transactions…"
              className="h-10 w-80 pl-8 pr-8 text-xs"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setDebouncedSearch("");
                  setPage(0);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground fine-hover:text-foreground transition-colors"
              >
                <Cancel01Icon size={13} />
              </button>
            )}
          </div>
        </div>

        <Button className="h-10" onClick={handleNewTransaction}>
          + New Transaction
        </Button>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : (
        <TransactionTable
          data={transactions}
          globalFilter={search}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Pagination */}
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
