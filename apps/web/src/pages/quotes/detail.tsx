import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { format } from "date-fns";
import {
  ArrowLeft01Icon,
  Copy01Icon,
  Delete01Icon,
  Download01Icon,
  FileEditIcon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  Sent02Icon,
  Invoice01Icon,
} from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Separator } from "@travada-books/ui/components/separator";
import { Textarea } from "@travada-books/ui/components/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import {
  QuoteStatusBadge,
  type QuoteStatus,
} from "@/components/quotes/quote-status-badge";
import { cn } from "@travada-books/ui/lib/utils";

const mockQuote = {
  id: "1",
  number: "QUO-0001",
  status: "accepted" as QuoteStatus,
  customer: "Callfast Services LTD",
  customerEmail: "billing@callfast.co.ke",
  amount: 25890,
  currency: "KES",
  validUntil: "30/06/2025",
  issueDate: "01/06/2025",
  notes: "This quote is valid for 30 days from the issue date.",
  createdAt: new Date("2025-06-01T09:00:00"),
  sentAt: new Date("2025-06-01T09:05:00"),
  acceptedAt: new Date("2025-06-03T14:22:00"),
  declinedAt: null as Date | null,
  declineReason: null as string | null,
  // When accepted, this links to the created invoice
  invoiceNumber: "INV-0005",
  invoiceId: "5",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-quote",
  items: [
    { description: "Web Development Services", qty: 1, rate: 20000, tax: 16 },
    { description: "Hosting & Maintenance (1 year)", qty: 1, rate: 5890, tax: 0 },
  ],
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-3 text-xs font-semibold"
      >
        {title}
        <span className="text-muted-foreground text-base leading-none">
          {open ? "∧" : "∨"}
        </span>
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

function ActivityItem({
  label,
  date,
  done,
  note,
}: {
  label: string;
  date: Date | null;
  done: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 text-xs">
      <div
        className={cn(
          "mt-0.5 size-2 shrink-0 rounded-full",
          done ? "bg-foreground" : "border-2 border-muted-foreground/30",
        )}
      />
      <div className="flex-1">
        <span className={cn(!done && "text-muted-foreground")}>{label}</span>
        {note && (
          <p className="mt-0.5 text-muted-foreground italic">"{note}"</p>
        )}
      </div>
      {date && (
        <span className="shrink-0 text-muted-foreground">
          {format(date, "MMM d, HH:mm")}
        </span>
      )}
    </div>
  );
}

export function QuoteDetailPage() {
  const navigate = useNavigate();
  useParams();
  const [internalNote, setInternalNote] = useState("");
  const [copied, setCopied] = useState(false);

  const subtotal = mockQuote.items.reduce(
    (sum, item) => sum + item.qty * item.rate,
    0,
  );
  const tax = mockQuote.items.reduce(
    (sum, item) => sum + item.qty * item.rate * (item.tax / 100),
    0,
  );
  const total = subtotal + tax;

  const quoteUrl = `${window.location.origin}/q/${mockQuote.token}`;
  const isTerminal =
    mockQuote.status === "accepted" || mockQuote.status === "declined";

  function handleCopyLink() {
    navigator.clipboard.writeText(quoteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex shrink-0 items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/quotes")}
          >
            <ArrowLeft01Icon size={14} />
          </Button>
          <span className="font-mono text-sm font-medium">
            {mockQuote.number}
          </span>
          <QuoteStatusBadge status={mockQuote.status} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5">
            <Download01Icon size={13} />
            Download PDF
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={handleCopyLink}
          >
            <Copy01Icon size={13} />
            {copied ? "Copied!" : "Copy link"}
          </Button>
          {mockQuote.status === "draft" && (
            <Button variant="outline" className="gap-1.5">
              <Sent02Icon size={13} />
              Send Quote
            </Button>
          )}
          {!isTerminal && (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => navigate(`/quotes/${mockQuote.id}/edit`)}
            >
              <PencilEdit01Icon size={13} />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" />}
            >
              <MoreHorizontalIcon size={13} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <FileEditIcon size={13} />
                Duplicate
              </DropdownMenuItem>
              {mockQuote.status === "sent" && (
                <DropdownMenuItem>
                  <Sent02Icon size={13} />
                  Send Reminder
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Delete01Icon size={13} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-muted/30">
        <div className="mx-auto flex max-w-2xl flex-col gap-0 px-4 py-8">

          {/* Accepted banner — links to the generated invoice */}
          {mockQuote.status === "accepted" && mockQuote.invoiceId && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs dark:border-green-900/40 dark:bg-green-900/20">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Invoice01Icon size={14} />
                <span>
                  Invoice <span className="font-mono font-semibold">{mockQuote.invoiceNumber}</span> was created from this quote.
                </span>
              </div>
              <Link
                to={`/invoices/${mockQuote.invoiceId}`}
                className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800 dark:text-green-400"
              >
                View Invoice
              </Link>
            </div>
          )}

          {/* Declined banner — shows reason */}
          {mockQuote.status === "declined" && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs dark:border-red-900/40 dark:bg-red-900/20">
              <p className="font-medium text-red-700 dark:text-red-400">
                Quote declined
              </p>
              {mockQuote.declineReason && (
                <p className="mt-1 text-red-600/80 dark:text-red-400/70 italic">
                  "{mockQuote.declineReason}"
                </p>
              )}
            </div>
          )}

          {/* Quote preview card */}
          <div className="rounded-lg border bg-white p-10 text-sm shadow-sm dark:bg-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold">
                  TB
                </div>
                <p className="mt-2 font-semibold text-foreground">
                  Your Business Name
                </p>
                <p className="text-xs text-muted-foreground">Nairobi, Kenya</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">QUOTATION</p>
                <p className="text-xs text-muted-foreground">
                  {mockQuote.number}
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Prepared For
                </p>
                <p className="mt-1.5 font-medium text-foreground">
                  {mockQuote.customer}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mockQuote.customerEmail}
                </p>
              </div>
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Issue date:</span>
                  <span className="font-medium">{mockQuote.issueDate}</span>
                </div>
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">Valid until:</span>
                  <span className="font-medium">{mockQuote.validUntil}</span>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-3 text-left font-medium">Description</th>
                  <th className="pb-3 text-right font-medium">Qty</th>
                  <th className="pb-3 text-right font-medium">Rate</th>
                  <th className="pb-3 text-right font-medium">Tax</th>
                  <th className="pb-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {mockQuote.items.map((item, i) => (
                  <tr key={i} className="border-b border-dashed">
                    <td className="py-3">{item.description}</td>
                    <td className="py-3 text-right">{item.qty}</td>
                    <td className="py-3 text-right">
                      {mockQuote.currency} {item.rate.toLocaleString("en-KE")}
                    </td>
                    <td className="py-3 text-right">{item.tax}%</td>
                    <td className="py-3 text-right font-medium">
                      {mockQuote.currency}{" "}
                      {(item.qty * item.rate * (1 + item.tax / 100)).toLocaleString(
                        "en-KE",
                        { minimumFractionDigits: 2 },
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-5 flex flex-col items-end gap-1.5 text-xs">
              <div className="flex w-48 justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>
                  {mockQuote.currency}{" "}
                  {subtotal.toLocaleString("en-KE", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex w-48 justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>
                  {mockQuote.currency}{" "}
                  {tax.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Separator className="my-1 w-48" />
              <div className="flex w-48 justify-between text-sm font-semibold">
                <span>Total</span>
                <span>
                  {mockQuote.currency}{" "}
                  {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {mockQuote.notes && (
              <>
                <Separator className="my-6" />
                <div>
                  <p className="text-xs font-medium">Notes</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mockQuote.notes}
                  </p>
                </div>
              </>
            )}

            <Separator className="my-6" />
            <p className="text-center text-[10px] text-muted-foreground">
              Powered by{" "}
              <span className="underline underline-offset-2">Travada Books</span>
            </p>
          </div>

          {/* Detail sections */}
          <div className="mt-4 rounded-lg border bg-background divide-y">
            <div className="px-5">
              <DetailRow label="Valid until" value={mockQuote.validUntil} />
              <Separator />
              <DetailRow label="Issue date" value={mockQuote.issueDate} />
              <Separator />
              <DetailRow label="Quote no." value={mockQuote.number} />
            </div>

            {/* Activity */}
            <div className="px-5">
              <CollapsibleSection title="Activity">
                <div className="flex flex-col">
                  <ActivityItem
                    label="Created"
                    date={mockQuote.createdAt}
                    done
                  />
                  {mockQuote.sentAt && (
                    <ActivityItem label="Sent" date={mockQuote.sentAt} done />
                  )}
                  {mockQuote.acceptedAt && (
                    <ActivityItem
                      label="Accepted"
                      date={mockQuote.acceptedAt}
                      done
                    />
                  )}
                  {mockQuote.declinedAt && (
                    <ActivityItem
                      label="Declined"
                      date={mockQuote.declinedAt}
                      done
                      note={mockQuote.declineReason ?? undefined}
                    />
                  )}
                  {!mockQuote.acceptedAt && !mockQuote.declinedAt && (
                    <ActivityItem
                      label="Awaiting response"
                      date={null}
                      done={false}
                    />
                  )}
                </div>
              </CollapsibleSection>
            </div>

            {/* Internal note */}
            <div className="px-5">
              <CollapsibleSection title="Internal note" defaultOpen={false}>
                <Textarea
                  placeholder="Add a private note about this quote — not visible to the client."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  className="text-xs"
                  rows={3}
                />
              </CollapsibleSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
