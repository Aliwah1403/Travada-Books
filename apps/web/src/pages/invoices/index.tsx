import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search01Icon, Cancel01Icon } from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Spinner } from "@/components/shared/spinner";
import { InvoiceStats } from "@/components/invoices/invoice-stats";
import { InvoiceTable, type Invoice } from "@/components/invoices/invoice-table";
import { QuotePreviewSheet } from "@/components/quotes/quote-preview-sheet";
import { listInvoices, getInvoiceSummary } from "@/lib/queries/invoices";
import { parseInvoiceFilters } from "@/lib/queries/ai";
import { useAuth } from "@/contexts/auth-context";
import { useFormatDate } from "@/hooks/use-format-date";

function toTableInvoice(
  inv: Awaited<ReturnType<typeof listInvoices>>[number],
  formatDate: (v: string | null | undefined) => string,
): Invoice {
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
    invoiceRecurring: series ? {
      nextScheduledAt: series.next_scheduled_at,
      endAfterCount: series.end_after_count,
      currentCount: series.current_count,
      endType: series.end_type,
    } : null,
  };
}

function fmtSummary(data: { total_amount: number; invoice_count: number; currency: string } | undefined, label: string, orgCurrency: string) {
  const currency = data?.currency ?? orgCurrency;
  const amount = data?.total_amount ?? 0;
  return { label, amount, currency, count: data?.invoice_count ?? 0 };
}

type AIFilters = {
  search?: string
  statuses?: string[]
  dateFrom?: string
  dateTo?: string
}

type ActiveChip = { key: string; label: string }

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
      {label}
      <button type="button" onClick={onRemove} className="fine-hover:text-foreground transition-colors">
        <Cancel01Icon size={11} />
      </button>
    </span>
  );
}

export function InvoicesPage() {
  const navigate = useNavigate();
  const { orgId, org } = useAuth();
  const orgCurrency = org?.base_currency ?? "KES";
  const { formatDate } = useFormatDate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState("");
  const [aiFilters, setAiFilters] = useState<AIFilters>({});
  const [isAIParsing, setIsAIParsing] = useState(false);
  const [previewQuoteId, setPreviewQuoteId] = useState<string | null>(null);

  const { data: rawInvoices = [], isLoading } = useQuery({
    queryKey: ["invoices", orgId],
    queryFn: () => listInvoices(orgId!),
    enabled: !!orgId,
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

  // Apply AI filters to in-memory data
  const filteredRaw = useMemo(() => {
    let result = rawInvoices;
    if (aiFilters.statuses?.length) {
      result = result.filter((inv) => aiFilters.statuses!.includes(inv.status));
    }
    if (aiFilters.dateFrom) {
      result = result.filter((inv) => inv.issue_date && inv.issue_date >= aiFilters.dateFrom!);
    }
    if (aiFilters.dateTo) {
      result = result.filter((inv) => inv.issue_date && inv.issue_date <= aiFilters.dateTo!);
    }
    return result;
  }, [rawInvoices, aiFilters]);

  const invoices = filteredRaw.map((inv) => toTableInvoice(inv, formatDate));

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) { clearAll(); return; }

    const words = trimmed.split(/\s+/);
    if (words.length === 1) {
      setAiFilters({ search: trimmed });
      return;
    }

    setIsAIParsing(true);
    try {
      const parsed = await parseInvoiceFilters({
        input: trimmed,
        currentDate: new Date().toISOString().split("T")[0],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setAiFilters({
        search: parsed.name ?? undefined,
        statuses: parsed.statuses ?? undefined,
        dateFrom: parsed.dateFrom ?? undefined,
        dateTo: parsed.dateTo ?? undefined,
      });
    } catch {
      setAiFilters({ search: trimmed });
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
    setAiFilters({});
    inputRef.current?.focus();
  }

  function removeFilter(key: keyof AIFilters) {
    setAiFilters((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  const activeChips = useMemo<ActiveChip[]>(() => {
    const chips: ActiveChip[] = [];
    if (aiFilters.dateFrom || aiFilters.dateTo) {
      const from = aiFilters.dateFrom ? format(new Date(aiFilters.dateFrom), "MMM d") : null;
      const to = aiFilters.dateTo ? format(new Date(aiFilters.dateTo), "MMM d") : null;
      const label = from && to ? `${from} – ${to}` : from ? `From ${from}` : `Until ${to}`;
      chips.push({ key: "dateFrom", label: label! });
    }
    if (aiFilters.statuses?.length) {
      chips.push({ key: "statuses", label: aiFilters.statuses.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ") });
    }
    return chips;
  }, [aiFilters]);

  const hasActiveFilters = !!aiFilters.search || activeChips.length > 0;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
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

  return (
    <div className="flex flex-col gap-6 p-6">
      <InvoiceStats {...stats} />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-2">
          <form onSubmit={handleSubmit} className="relative">
            {isAIParsing ? (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Spinner size={14} />
              </span>
            ) : (
              <Search01Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              ref={inputRef}
              placeholder="Search or filter invoices…"
              className="h-10 w-80 pl-8 pr-8 text-xs"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={isAIParsing}
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground fine-hover:text-foreground transition-colors"
              >
                <Cancel01Icon size={13} />
              </button>
            )}
          </form>

          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeChips.map((chip) => (
                <FilterChip
                  key={chip.key}
                  label={chip.label}
                  onRemove={() => removeFilter(chip.key as keyof AIFilters)}
                />
              ))}
            </div>
          )}
        </div>

        <Button className="h-10" onClick={() => navigate("/invoices/create")}>
          + New Invoice
        </Button>
      </div>

      <InvoiceTable
        data={invoices}
        globalFilter={aiFilters.search ?? ""}
        onQuoteClick={(quoteId) => setPreviewQuoteId(quoteId)}
      />

      <QuotePreviewSheet
        quoteId={previewQuoteId}
        onOpenChange={(open) => { if (!open) setPreviewQuoteId(null); }}
      />
    </div>
  );
}
