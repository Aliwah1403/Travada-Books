import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { FilterIcon, Search01Icon, Cancel01Icon } from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { InvoiceStats } from "@/components/invoices/invoice-stats";
import { InvoiceTable, type Invoice } from "@/components/invoices/invoice-table";
import { QuotePreviewSheet } from "@/components/quotes/quote-preview-sheet";
import { listInvoices, getInvoiceSummary } from "@/lib/queries/invoices";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";

function toTableInvoice(inv: Awaited<ReturnType<typeof listInvoices>>[number]): Invoice {
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
    dueDate: inv.due_date ? format(new Date(inv.due_date), "dd/MM/yyyy") : null,
    issueDate: inv.issue_date ? format(new Date(inv.issue_date), "dd/MM/yyyy") : null,
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

export function InvoicesPage() {
  const navigate = useNavigate();
  const { orgId, org } = useAuth();
  const orgCurrency = org?.base_currency ?? "KES";
  const [search, setSearch] = useState("");
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


  const invoices = rawInvoices.map(toTableInvoice);
  const stats = {
    open: fmtSummary(openSummary, "Open", orgCurrency),
    overdue: fmtSummary(overdueSummary, "Overdue", orgCurrency),
    paid: fmtSummary(paidSummary, "Paid", orgCurrency),
  };

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
        onQuoteClick={(quoteId) => setPreviewQuoteId(quoteId)}
      />

      <QuotePreviewSheet
        quoteId={previewQuoteId}
        onOpenChange={(open) => {
          if (!open) setPreviewQuoteId(null);
        }}
      />
    </div>
  );
}
