import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search01Icon, Cancel01Icon } from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Skeleton } from "@travada-books/ui/components/skeleton";
import { Spinner } from "@/components/shared/spinner";
import { QuoteStats } from "@/components/quotes/quote-stats";
import { QuoteTable, type Quote as UIQuote } from "@/components/quotes/quote-table";
import { listQuotes } from "@/lib/queries/quotes";
import { parseQuoteFilters } from "@/lib/queries/ai";
import { useAuth } from "@/contexts/auth-context";
import { useFormatDate } from "@/hooks/use-format-date";

function resolveStatus(status: string, validUntil: string | null): UIQuote["status"] {
  if (status === "sent" && validUntil && new Date(validUntil) < new Date()) {
    return "expired";
  }
  return status as UIQuote["status"];
}

function getStats(quotes: UIQuote[], currency: string) {
  const open = quotes.filter((q) => q.status === "draft" || q.status === "sent");
  const accepted = quotes.filter((q) => q.status === "accepted");
  const expired = quotes.filter((q) => q.status === "expired");
  const sum = (arr: UIQuote[]) => arr.reduce((acc, q) => acc + q.amount, 0);
  return {
    open: { label: "Open", amount: sum(open), currency, count: open.length },
    accepted: { label: "Accepted", amount: sum(accepted), currency, count: accepted.length },
    expired: { label: "Expired", amount: sum(expired), currency, count: expired.length },
  };
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

export function QuotesPage() {
  const navigate = useNavigate();
  const { orgId, org } = useAuth();
  const orgCurrency = org?.base_currency ?? "KES";
  const { formatDate } = useFormatDate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState("");
  const [aiFilters, setAiFilters] = useState<AIFilters>({});
  const [isAIParsing, setIsAIParsing] = useState(false);

  const { data: rawQuotes = [], isLoading } = useQuery({
    queryKey: ["quotes", orgId],
    queryFn: () => listQuotes(orgId!),
    enabled: !!orgId,
  });

  const allQuotes: UIQuote[] = rawQuotes.map((q) => ({
    id: q.id,
    number: q.quote_number ?? "—",
    token: q.token,
    status: resolveStatus(q.status, q.valid_until),
    validUntil: q.valid_until ? formatDate(q.valid_until) : "—",
    customer: q.customer_name ?? "—",
    customerLogoUrl: q.customers?.logo_url ?? null,
    amount: q.total ?? 0,
    currency: q.currency,
    issueDate: q.issue_date ? formatDate(q.issue_date) : "—",
  }));

  // Apply AI filters in-memory
  const filteredQuotes = useMemo(() => {
    let result = rawQuotes;
    if (aiFilters.statuses?.length) {
      result = result.filter((q) => {
        const resolved = resolveStatus(q.status, q.valid_until);
        return aiFilters.statuses!.includes(resolved);
      });
    }
    if (aiFilters.dateFrom) {
      result = result.filter((q) => q.issue_date && q.issue_date >= aiFilters.dateFrom!);
    }
    if (aiFilters.dateTo) {
      result = result.filter((q) => q.issue_date && q.issue_date <= aiFilters.dateTo!);
    }
    return result;
  }, [rawQuotes, aiFilters]);

  const quotes: UIQuote[] = filteredQuotes.map((q) => ({
    id: q.id,
    number: q.quote_number ?? "—",
    token: q.token,
    status: resolveStatus(q.status, q.valid_until),
    validUntil: q.valid_until ? formatDate(q.valid_until) : "—",
    customer: q.customer_name ?? "—",
    customerLogoUrl: q.customers?.logo_url ?? null,
    amount: q.total ?? 0,
    currency: q.currency,
    issueDate: q.issue_date ? formatDate(q.issue_date) : "—",
  }));

  const stats = getStats(allQuotes, orgCurrency);

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
      const parsed = await parseQuoteFilters({
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

  return (
    <div className="flex flex-col gap-6 p-6">
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <QuoteStats {...stats} />
      )}

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
              placeholder="Search or filter quotes…"
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

        <Button className="h-10" onClick={() => navigate("/quotes/create")}>
          + New Quote
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 rounded-lg" />
      ) : (
        <QuoteTable data={quotes} globalFilter={aiFilters.search ?? ""} />
      )}
    </div>
  );
}
