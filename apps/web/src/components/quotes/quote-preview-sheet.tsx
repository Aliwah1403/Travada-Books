import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowRight01Icon,
  Invoice01Icon,
} from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Separator } from "@travada-books/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@travada-books/ui/components/sheet";
import { QuoteStatusBadge } from "./quote-status-badge";
import { getQuote } from "@/lib/queries/quotes";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import type { Invoice } from "@/lib/queries/invoices";

type QuotePreviewSheetProps = {
  quoteId: string | null;
  onOpenChange: (open: boolean) => void;
};

export function QuotePreviewSheet({ quoteId, onOpenChange }: QuotePreviewSheetProps) {
  const navigate = useNavigate();
  const { orgId } = useAuth();
  const open = quoteId !== null;

  const { data: quote, isLoading } = useQuery({
    queryKey: ["quote", quoteId],
    queryFn: () => getQuote(quoteId!, orgId!),
    enabled: !!quoteId && !!orgId,
  });

  const { data: linkedInvoice } = useQuery({
    queryKey: ["invoice-by-quote", quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number")
        .eq("quote_id", quoteId!)
        .maybeSingle();
      if (error) throw error;
      return data as Pick<Invoice, "id" | "invoice_number"> | null;
    },
    enabled: !!quoteId && quote?.status === "accepted",
  });

  const from = (quote?.from_details ?? {}) as Record<string, string | null>;
  const customer = (quote?.customer_details ?? {}) as Record<string, string | null>;
  const items = (quote?.line_items ?? []) as Array<{ description: string; quantity: number; price: number; tax_rate: number }>;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col w-[520px] sm:max-w-[520px] p-0">
        <SheetHeader className="flex flex-row items-center justify-between gap-3 border-b px-6 py-4">
          <div className="flex items-center gap-2.5">
            <SheetTitle className="font-mono text-sm font-medium">
              {quote?.quote_number ?? "—"}
            </SheetTitle>
            {quote && <QuoteStatusBadge status={quote.status} />}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto bg-muted/30 px-6 py-6">
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {!isLoading && !quote && (
            <p className="text-sm text-muted-foreground">Quote not found.</p>
          )}

          {quote && (
            <>
              {quote.status === "accepted" && linkedInvoice && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs dark:border-green-900/40 dark:bg-green-900/20">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Invoice01Icon size={13} />
                    <span>
                      Invoice{" "}
                      <span className="font-mono font-semibold">{linkedInvoice.invoice_number}</span>{" "}
                      created from this quote.
                    </span>
                  </div>
                  <button
                    onClick={() => { onOpenChange(false); navigate(`/invoices/${linkedInvoice.id}`); }}
                    className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800 dark:text-green-400 text-xs"
                  >
                    View
                  </button>
                </div>
              )}

              <div className="rounded-lg border bg-white p-8 text-sm shadow-sm dark:bg-card">
                {/* Letterhead */}
                <div className="flex items-start justify-between">
                  <div>
                    {from["logo_url"] ? (
                      <img src={from["logo_url"]} alt="" className="h-8 w-auto max-w-[120px] object-contain" />
                    ) : (
                      <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold">
                        {(from["name"] ?? "TB").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <p className="mt-2 text-xs font-semibold text-foreground">{from["name"] ?? "Your Business"}</p>
                    {from["email"] && <p className="text-[10px] text-muted-foreground">{from["email"]}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-foreground">QUOTATION</p>
                    <p className="text-[10px] text-muted-foreground">{quote.quote_number}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-medium uppercase tracking-wide text-muted-foreground text-[10px]">Prepared For</p>
                    <p className="mt-1 font-medium text-foreground">{customer["name"] ?? quote.customer_name}</p>
                    {customer["address_line1"] && <p className="text-muted-foreground">{customer["address_line1"]}</p>}
                    {customer["city"] && <p className="text-muted-foreground">{customer["city"]}</p>}
                    {customer["phone"] && <p className="text-muted-foreground">{customer["phone"]}</p>}
                    {(customer["billing_email"] ?? customer["email"]) && (
                      <p className="text-muted-foreground">{customer["billing_email"] ?? customer["email"]}</p>
                    )}
                  </div>
                  <div className="space-y-1 text-right">
                    {quote.issue_date && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Issue date:</span>
                        <span className="font-medium">{format(new Date(quote.issue_date), "dd/MM/yyyy")}</span>
                      </div>
                    )}
                    {quote.valid_until && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Valid until:</span>
                        <span className="font-medium">{format(new Date(quote.valid_until), "dd/MM/yyyy")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Currency:</span>
                      <span className="font-medium">{quote.currency}</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-2 text-left font-medium">Description</th>
                      <th className="pb-2 text-right font-medium">Qty</th>
                      <th className="pb-2 text-right font-medium">Rate</th>
                      <th className="pb-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b border-dashed">
                        <td className="py-2">{item.description}</td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2 text-right">{quote.currency} {item.price.toLocaleString("en-KE")}</td>
                        <td className="py-2 text-right font-medium">
                          {quote.currency} {(item.quantity * item.price).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-4 flex flex-col items-end gap-1 text-xs">
                  <div className="flex w-44 justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{quote.currency} {(quote.subtotal ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {(quote.tax_amount ?? 0) > 0 && (
                    <div className="flex w-44 justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{quote.currency} {(quote.tax_amount ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {(quote.discount ?? 0) > 0 && (
                    <div className="flex w-44 justify-between text-green-600">
                      <span>Discount</span>
                      <span>− {quote.currency} {(quote.discount ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <Separator className="my-1 w-44" />
                  <div className="flex w-44 justify-between font-semibold text-sm">
                    <span>Total</span>
                    <span>{quote.currency} {(quote.total ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {quote.note && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-xs font-medium">Notes</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{quote.note}</p>
                    </div>
                  </>
                )}

                <Separator className="my-4" />
                <p className="text-center text-[10px] text-muted-foreground">Powered by Travada Books</p>
              </div>
            </>
          )}
        </div>

        {quote && (
          <>
            <Separator />
            <div className="flex items-center gap-2 px-6 py-4">
              <Button
                className="ml-auto gap-1.5"
                size="sm"
                onClick={() => { onOpenChange(false); navigate(`/quotes/${quote.id}`); }}
              >
                Open Quote
                <ArrowRight01Icon size={13} />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
