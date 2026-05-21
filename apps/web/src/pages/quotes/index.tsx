import { useState } from "react";
import { useNavigate } from "react-router";
import { FilterIcon, Search01Icon, Cancel01Icon } from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { QuoteStats } from "@/components/quotes/quote-stats";
import { QuoteTable, type Quote } from "@/components/quotes/quote-table";

const mockQuotes: Quote[] = [
  {
    id: "1",
    number: "QUO-0001",
    status: "accepted",
    customer: "Callfast Services LTD",
    amount: 25890,
    currency: "KES",
    validUntil: "30/06/2025",
    issueDate: "01/06/2025",
  },
  {
    id: "2",
    number: "QUO-0002",
    status: "sent",
    customer: "Studio X",
    amount: 800,
    currency: "USD",
    validUntil: "15/07/2025",
    issueDate: "15/06/2025",
  },
  {
    id: "3",
    number: "QUO-0003",
    status: "declined",
    customer: "Acme Ltd",
    amount: 5000,
    currency: "KES",
    validUntil: "01/05/2025",
    issueDate: "01/04/2025",
  },
  {
    id: "4",
    number: "QUO-0004",
    status: "draft",
    customer: "Nova Agency",
    amount: 12500,
    currency: "KES",
    validUntil: "31/07/2025",
    issueDate: "20/06/2025",
  },
  {
    id: "5",
    number: "QUO-0005",
    status: "expired",
    customer: "Bright Futures NGO",
    amount: 45000,
    currency: "KES",
    validUntil: "01/03/2025",
    issueDate: "01/02/2025",
  },
];

function getStats(quotes: Quote[]) {
  const open = quotes.filter(
    (q) => q.status === "draft" || q.status === "sent",
  );
  const accepted = quotes.filter((q) => q.status === "accepted");
  const expired = quotes.filter((q) => q.status === "expired");

  const sum = (arr: Quote[]) =>
    arr.reduce(
      (acc, q) => acc + (q.currency === "KES" ? q.amount : q.amount * 130),
      0,
    );

  return {
    open: {
      label: "Open",
      amount: `KES ${sum(open).toLocaleString("en-KE")}`,
      count: open.length,
    },
    accepted: {
      label: "Accepted",
      amount: `KES ${sum(accepted).toLocaleString("en-KE")}`,
      count: accepted.length,
    },
    expired: {
      label: "Expired",
      amount: `KES ${sum(expired).toLocaleString("en-KE")}`,
      count: expired.length,
    },
  };
}

export function QuotesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const stats = getStats(mockQuotes);

  return (
    <div className="flex flex-col gap-6 p-6">
      <QuoteStats {...stats} />

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

      <QuoteTable data={mockQuotes} globalFilter={search} />
    </div>
  );
}
