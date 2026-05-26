import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { FilterIcon, Search01Icon, Cancel01Icon } from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { InvoiceStats } from "@/components/invoices/invoice-stats";
import { InvoiceTable, type Invoice } from "@/components/invoices/invoice-table";
import { QuotePreviewSheet } from "@/components/quotes/quote-preview-sheet";
import { listInvoices } from "@/lib/queries/invoices";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";

function toTableInvoice(inv: Awaited<ReturnType<typeof listInvoices>>[number]): Invoice {
  return {
    id: inv.id,
    number: inv.invoice_number ?? "—",
    status: inv.status as Invoice["status"],
    customer: inv.customer_name,
    amount: inv.total ?? 0,
    currency: inv.currency,
    dueDate: inv.due_date ? format(new Date(inv.due_date), "dd/MM/yyyy") : null,
    issueDate: inv.issue_date ? format(new Date(inv.issue_date), "dd/MM/yyyy") : null,
    recurring: inv.recurring,
    token: inv.token,
  };
}

function getStats(invoices: ReturnType<typeof toTableInvoice>[]) {
  const open = invoices.filter((i) => i.status === "draft" || i.status === "unpaid");
  const overdue = invoices.filter((i) => i.status === "overdue");
  const paid = invoices.filter((i) => i.status === "paid");

  const sum = (arr: typeof invoices) =>
    arr.reduce((acc, i) => acc + (i.currency === "KES" ? i.amount : i.amount * 130), 0);

  return {
    open: {
      label: "Open",
      amount: `KES ${sum(open).toLocaleString("en-KE")}`,
      count: open.length,
    },
    overdue: {
      label: "Overdue",
      amount: `KES ${sum(overdue).toLocaleString("en-KE")}`,
      count: overdue.length,
    },
    paid: {
      label: "Paid",
      amount: `KES ${sum(paid).toLocaleString("en-KE")}`,
      count: paid.length,
    },
  };
}

export function InvoicesPage() {
  const navigate = useNavigate();
  const { orgId } = useAuth();
  const [search, setSearch] = useState("");
  const [previewQuote, setPreviewQuote] = useState<string | null>(null);

  const { data: rawInvoices = [], isLoading } = useQuery({
    queryKey: ["invoices", orgId],
    queryFn: () => listInvoices(orgId!),
    enabled: !!orgId,
  });

  const invoices = rawInvoices.map(toTableInvoice);
  const stats = getStats(invoices);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-lg border bg-muted/40 animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-lg border bg-muted/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <InvoiceStats {...stats} />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center justify-center gap-2">
          <div className="relative">
            <Search01Icon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search invoices..."
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

        <Button className="h-10" onClick={() => navigate("/invoices/create")}>
          + New Invoice
        </Button>
      </div>

      <InvoiceTable
        data={invoices}
        globalFilter={search}
        onQuoteClick={(quoteNumber) => setPreviewQuote(quoteNumber)}
      />

      <QuotePreviewSheet
        quoteNumber={previewQuote}
        onOpenChange={(open) => {
          if (!open) setPreviewQuote(null);
        }}
      />
    </div>
  );
}
