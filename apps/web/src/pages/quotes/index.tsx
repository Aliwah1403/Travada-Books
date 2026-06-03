import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { FilterIcon, Search01Icon, Cancel01Icon } from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Skeleton } from "@travada-books/ui/components/skeleton";
import { QuoteStats } from "@/components/quotes/quote-stats";
import { QuoteTable, type Quote as UIQuote } from "@/components/quotes/quote-table";
import { listQuotes } from "@/lib/queries/quotes";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";

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

export function QuotesPage() {
  const navigate = useNavigate();
  const { orgId, org } = useAuth();
  const orgCurrency = org?.base_currency ?? "KES";
  const [search, setSearch] = useState("");

  const { data: rawQuotes = [], isLoading } = useQuery({
    queryKey: ["quotes", orgId],
    queryFn: () => listQuotes(orgId!),
    enabled: !!orgId,
  });

  const quotes: UIQuote[] = rawQuotes.map((q) => ({
    id: q.id,
    number: q.quote_number ?? "—",
    token: q.token,
    status: resolveStatus(q.status, q.valid_until),
    validUntil: q.valid_until ? format(new Date(q.valid_until), "dd/MM/yyyy") : "—",
    customer: q.customer_name ?? "—",
    customerLogoUrl: q.customers?.logo_url ?? null,
    amount: q.total ?? 0,
    currency: q.currency,
    issueDate: q.issue_date ? format(new Date(q.issue_date), "dd/MM/yyyy") : "—",
  }));

  const stats = getStats(quotes, orgCurrency);

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
        <div className="flex items-center justify-center gap-2">
          <div className="relative">
            <Search01Icon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search quotes..."
              className="h-10 w-80 pl-8 pr-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Cancel01Icon size={13} />
              </button>
            )}
          </div>
          <Button variant="outline" size="icon" className="size-10">
            <FilterIcon size={14} />
          </Button>
        </div>

        <Button className="h-10" onClick={() => navigate("/quotes/create")}>
          + New Quote
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 rounded-lg" />
      ) : (
        <QuoteTable data={quotes} globalFilter={search} />
      )}
    </div>
  );
}
