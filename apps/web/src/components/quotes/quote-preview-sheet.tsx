import { useNavigate } from "react-router";
import {
  Copy01Icon,
  Download01Icon,
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
  SheetFooter,
} from "@travada-books/ui/components/sheet";
import { QuoteStatusBadge, type QuoteStatus } from "./quote-status-badge";

type QuotePreviewData = {
  id: string;
  number: string;
  status: QuoteStatus;
  customer: string;
  customerEmail: string;
  currency: string;
  issueDate: string;
  validUntil: string;
  notes?: string;
  invoiceNumber?: string;
  invoiceId?: string;
  items: { description: string; qty: number; rate: number; tax: number }[];
};

// Mock lookup — replaced by a real query when backend is wired
const mockQuotes: Record<string, QuotePreviewData> = {
  "QUO-0001": {
    id: "1",
    number: "QUO-0001",
    status: "accepted",
    customer: "Callfast Services LTD",
    customerEmail: "billing@callfast.co.ke",
    currency: "KES",
    issueDate: "01/06/2025",
    validUntil: "30/06/2025",
    notes: "This quote is valid for 30 days from the issue date.",
    invoiceNumber: "INV-0005",
    invoiceId: "5",
    items: [
      { description: "Web Development Services", qty: 1, rate: 20000, tax: 16 },
      { description: "Hosting & Maintenance (1 year)", qty: 1, rate: 5890, tax: 0 },
    ],
  },
};

type QuotePreviewSheetProps = {
  quoteNumber: string | null;
  onOpenChange: (open: boolean) => void;
};

export function QuotePreviewSheet({
  quoteNumber,
  onOpenChange,
}: QuotePreviewSheetProps) {
  const navigate = useNavigate();
  const open = quoteNumber !== null;
  const quote = quoteNumber ? mockQuotes[quoteNumber] : null;

  if (!quote) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex flex-col w-[480px] sm:max-w-[480px]">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle>Quote not found</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const subtotal = quote.items.reduce((sum, i) => sum + i.qty * i.rate, 0);
  const tax = quote.items.reduce(
    (sum, i) => sum + i.qty * i.rate * (i.tax / 100),
    0,
  );
  const total = subtotal + tax;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col w-[520px] sm:max-w-[520px] p-0"
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-center justify-between gap-3 border-b px-6 py-4">
          <div className="flex items-center gap-2.5">
            <SheetTitle className="font-mono text-sm font-medium">
              {quote.number}
            </SheetTitle>
            <QuoteStatusBadge status={quote.status} />
          </div>
        </SheetHeader>

        {/* Scrollable quote document */}
        <div className="flex-1 overflow-y-auto bg-muted/30 px-6 py-6">
          {/* Accepted banner */}
          {quote.status === "accepted" && quote.invoiceId && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs dark:border-green-900/40 dark:bg-green-900/20">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Invoice01Icon size={13} />
                <span>
                  Invoice{" "}
                  <span className="font-mono font-semibold">
                    {quote.invoiceNumber}
                  </span>{" "}
                  created from this quote.
                </span>
              </div>
              <button
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/invoices/${quote.invoiceId}`);
                }}
                className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800 dark:text-green-400 text-xs"
              >
                View
              </button>
            </div>
          )}

          <div className="rounded-lg border bg-white p-8 text-sm shadow-sm dark:bg-card">
            {/* Doc header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold">
                  TB
                </div>
                <p className="mt-2 text-xs font-semibold text-foreground">
                  Your Business Name
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Nairobi, Kenya
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-foreground">QUOTATION</p>
                <p className="text-[10px] text-muted-foreground">
                  {quote.number}
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-medium uppercase tracking-wide text-muted-foreground text-[10px]">
                  Prepared For
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {quote.customer}
                </p>
                <p className="text-muted-foreground">{quote.customerEmail}</p>
              </div>
              <div className="text-right">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Issue date:</span>
                  <span className="font-medium">{quote.issueDate}</span>
                </div>
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">Valid until:</span>
                  <span className="font-medium">{quote.validUntil}</span>
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
                {quote.items.map((item, i) => (
                  <tr key={i} className="border-b border-dashed">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-right">{item.qty}</td>
                    <td className="py-2 text-right">
                      {quote.currency} {item.rate.toLocaleString("en-KE")}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {quote.currency}{" "}
                      {(item.qty * item.rate).toLocaleString("en-KE", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex flex-col items-end gap-1 text-xs">
              <div className="flex w-44 justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>
                  {quote.currency}{" "}
                  {subtotal.toLocaleString("en-KE", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              {tax > 0 && (
                <div className="flex w-44 justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>
                    {quote.currency}{" "}
                    {tax.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <Separator className="my-1 w-44" />
              <div className="flex w-44 justify-between font-semibold text-sm">
                <span>Total</span>
                <span>
                  {quote.currency}{" "}
                  {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {quote.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-xs font-medium">Notes</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {quote.notes}
                  </p>
                </div>
              </>
            )}

            <Separator className="my-4" />
            <p className="text-center text-[10px] text-muted-foreground">
              Powered by Travada Books
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <Separator />
        <SheetFooter className="flex-row gap-2 px-6 py-4">
          <Button variant="outline" className="gap-1.5" size="sm">
            <Download01Icon size={13} />
            Download PDF
          </Button>
          <Button variant="outline" className="gap-1.5" size="sm">
            <Copy01Icon size={13} />
            Copy Link
          </Button>
          <Button
            className="ml-auto gap-1.5"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              navigate(`/quotes/${quote.id}`);
            }}
          >
            Open Quote
            <ArrowRight01Icon size={13} />
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
