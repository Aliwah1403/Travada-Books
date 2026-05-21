import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { format, addWeeks, addMonths, addYears } from "date-fns";
import {
  ArrowLeft01Icon,
  Copy01Icon,
  Delete01Icon,
  Download01Icon,
  FileEditIcon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  Sent02Icon,
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
  InvoiceStatusBadge,
  type InvoiceStatus,
} from "@/components/invoices/invoice-status-badge";
import { cn } from "@travada-books/ui/lib/utils";

const mockInvoice = {
  id: "2",
  number: "INV-0002",
  status: "sent" as InvoiceStatus,
  customer: "Callfast Services LTD",
  customerEmail: "billing@callfast.co.ke",
  amount: 25890,
  currency: "KES",
  dueDate: "09/12/2025",
  issueDate: "20/11/2025",
  recurring: "weekly" as
    | "one_time"
    | "weekly"
    | "biweekly"
    | "monthly"
    | "quarterly"
    | "yearly",
  recurringEnds: null as Date | null,
  notes: "Thank you for your business.",
  paymentDetails: "Equity Bank\nAccount: 1234567890\nM-Pesa: 0700 000 000",
  createdAt: new Date("2025-11-20T10:32:00"),
  sentAt: new Date("2025-11-20T10:35:00"),
  paidAt: null as Date | null,
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock",
  items: [
    { description: "Web Development Services", qty: 1, rate: 20000, tax: 16 },
    {
      description: "Hosting & Maintenance (1 year)",
      qty: 1,
      rate: 5890,
      tax: 0,
    },
  ],
};

const RECURRING_LABELS: Record<string, string> = {
  one_time: "One time",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Every 3 months",
  yearly: "Yearly",
};

function getUpcomingDates(frequency: string, count = 3): Date[] {
  const base = new Date();
  const dates: Date[] = [];
  for (let i = 1; i <= count; i++) {
    switch (frequency) {
      case "weekly":
        dates.push(addWeeks(base, i));
        break;
      case "biweekly":
        dates.push(addWeeks(base, i * 2));
        break;
      case "monthly":
        dates.push(addMonths(base, i));
        break;
      case "quarterly":
        dates.push(addMonths(base, i * 3));
        break;
      case "yearly":
        dates.push(addYears(base, i));
        break;
    }
  }
  return dates;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-center justify-between py-3 text-xs'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='font-medium'>{value}</span>
    </div>
  );
}

function CollapsibleSection({
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex w-full items-center justify-between py-3 text-xs font-semibold'
      >
        <div className='flex items-center gap-2'>
          {title}
          {badge}
        </div>
        <span className='text-muted-foreground text-base leading-none'>
          {open ? "∧" : "∨"}
        </span>
      </button>
      {open && <div className='pb-3'>{children}</div>}
    </div>
  );
}

export function InvoiceDetailPage() {
  const navigate = useNavigate();
  useParams();
  const [internalNote, setInternalNote] = useState("");
  const [copied, setCopied] = useState(false);

  const subtotal = mockInvoice.items.reduce(
    (sum, item) => sum + item.qty * item.rate,
    0,
  );
  const tax = mockInvoice.items.reduce(
    (sum, item) => sum + item.qty * item.rate * (item.tax / 100),
    0,
  );
  const total = subtotal + tax;

  const invoiceUrl = `${window.location.origin}/i/${mockInvoice.token}`;
  const isRecurring = mockInvoice.recurring !== "one_time";
  const upcomingDates =
    isRecurring ? getUpcomingDates(mockInvoice.recurring) : [];

  function handleCopyLink() {
    navigator.clipboard.writeText(invoiceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      {/* Page header */}
      <div className='flex shrink-0 items-center justify-between border-b px-6 py-3'>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={() => navigate("/invoices")}
          >
            <ArrowLeft01Icon size={14} />
          </Button>
          <span className='font-mono text-sm font-medium'>
            {mockInvoice.number}
          </span>
          <InvoiceStatusBadge status={mockInvoice.status} />
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' className='gap-1.5'>
            <Download01Icon size={13} />
            Download PDF
          </Button>
          <Button
            variant='outline'
            className='gap-1.5'
            onClick={handleCopyLink}
          >
            <Copy01Icon size={13} />
            {copied ? "Copied!" : "Copy link"}
          </Button>
          {mockInvoice.status !== "paid" && (
            <Button variant='outline' className='gap-1.5'>
              <Sent02Icon size={13} />
              {mockInvoice.status === "draft" ? "Send Invoice" : "Mark as paid"}
            </Button>
          )}
          <Button
            variant='outline'
            size='icon-sm'
            onClick={() => navigate(`/invoices/create`)}
          >
            <PencilEdit01Icon size={13} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant='outline' size='icon-sm' />}
            >
              <MoreHorizontalIcon size={13} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem>
                <FileEditIcon size={13} />
                Duplicate
              </DropdownMenuItem>
              {(mockInvoice.status === "sent" ||
                mockInvoice.status === "overdue") && (
                <DropdownMenuItem>
                  <Sent02Icon size={13} />
                  Send reminder
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className='text-destructive focus:text-destructive'>
                <Delete01Icon size={13} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Scrollable content */}
      <div className='flex-1 overflow-y-auto bg-muted/30'>
        <div className='mx-auto flex max-w-2xl flex-col gap-0 px-4 py-8'>
          {/* Invoice preview card */}
          <div className='rounded-lg border bg-white p-10 text-sm shadow-sm dark:bg-card'>
            <div className='flex items-start justify-between'>
              <div>
                <div className='flex size-9 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold'>
                  TB
                </div>
                <p className='mt-2 font-semibold text-foreground'>
                  Your Business Name
                </p>
                <p className='text-xs text-muted-foreground'>Nairobi, Kenya</p>
              </div>
              <div className='text-right'>
                <p className='text-2xl font-bold text-foreground'>INVOICE</p>
                <p className='text-xs text-muted-foreground'>
                  {mockInvoice.number}
                </p>
              </div>
            </div>

            <Separator className='my-6' />

            <div className='grid grid-cols-2 gap-6'>
              <div>
                <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                  Bill To
                </p>
                <p className='mt-1.5 font-medium text-foreground'>
                  {mockInvoice.customer}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {mockInvoice.customerEmail}
                </p>
              </div>
              <div>
                <div className='flex justify-between text-xs'>
                  <span className='text-muted-foreground'>Issue date:</span>
                  <span className='font-medium'>{mockInvoice.issueDate}</span>
                </div>
                <div className='mt-1 flex justify-between text-xs'>
                  <span className='text-muted-foreground'>Due date:</span>
                  <span className='font-medium'>{mockInvoice.dueDate}</span>
                </div>
              </div>
            </div>

            <Separator className='my-6' />

            <table className='w-full text-xs'>
              <thead>
                <tr className='border-b text-muted-foreground'>
                  <th className='pb-3 text-left font-medium'>Description</th>
                  <th className='pb-3 text-right font-medium'>Qty</th>
                  <th className='pb-3 text-right font-medium'>Rate</th>
                  <th className='pb-3 text-right font-medium'>Tax</th>
                  <th className='pb-3 text-right font-medium'>Amount</th>
                </tr>
              </thead>
              <tbody>
                {mockInvoice.items.map((item, i) => (
                  <tr key={i} className='border-b border-dashed'>
                    <td className='py-3'>{item.description}</td>
                    <td className='py-3 text-right'>{item.qty}</td>
                    <td className='py-3 text-right'>
                      {mockInvoice.currency} {item.rate.toLocaleString("en-KE")}
                    </td>
                    <td className='py-3 text-right'>{item.tax}%</td>
                    <td className='py-3 text-right font-medium'>
                      {mockInvoice.currency}{" "}
                      {(
                        item.qty *
                        item.rate *
                        (1 + item.tax / 100)
                      ).toLocaleString("en-KE", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className='mt-5 flex flex-col items-end gap-1.5 text-xs'>
              <div className='flex w-48 justify-between'>
                <span className='text-muted-foreground'>Subtotal</span>
                <span>
                  {mockInvoice.currency}{" "}
                  {subtotal.toLocaleString("en-KE", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className='flex w-48 justify-between'>
                <span className='text-muted-foreground'>Tax</span>
                <span>
                  {mockInvoice.currency}{" "}
                  {tax.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Separator className='my-1 w-48' />
              <div className='flex w-48 justify-between text-sm font-semibold'>
                <span>Total</span>
                <span>
                  {mockInvoice.currency}{" "}
                  {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {mockInvoice.paymentDetails && (
              <>
                <Separator className='my-6' />
                <div>
                  <p className='text-xs font-medium'>Payment Details</p>
                  <p className='mt-1 whitespace-pre-wrap text-xs text-muted-foreground'>
                    {mockInvoice.paymentDetails}
                  </p>
                </div>
              </>
            )}

            {mockInvoice.notes && (
              <>
                <Separator className='my-6' />
                <div>
                  <p className='text-xs font-medium'>Notes</p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {mockInvoice.notes}
                  </p>
                </div>
              </>
            )}

            <Separator className='my-6' />
            <p className='text-center text-[10px] text-muted-foreground'>
              Powered by{" "}
              <span className='underline underline-offset-2'>
                Travada Books
              </span>
            </p>
          </div>

          {/* Detail sections */}
          <div className='mt-4 rounded-lg border bg-background divide-y'>
            {/* Basic details */}
            <div className='px-5'>
              <DetailRow label='Due date' value={mockInvoice.dueDate} />
              <Separator />
              <DetailRow label='Issue date' value={mockInvoice.issueDate} />
              <Separator />
              <DetailRow label='Invoice no.' value={mockInvoice.number} />
              <Separator />
              <DetailRow
                label='Type'
                value={RECURRING_LABELS[mockInvoice.recurring]}
              />
            </div>

            {/* Recurring series — only shown if recurring */}
            {isRecurring && (
              <div className='px-5'>
                <CollapsibleSection
                  title='Recurring Series'
                  badge={
                    <span className='rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400'>
                      Active
                    </span>
                  }
                >
                  <div className='flex flex-col divide-y'>
                    {upcomingDates.map((date, i) => (
                      <div
                        key={i}
                        className='flex items-center justify-between py-2.5 text-xs'
                      >
                        <div className='flex items-center gap-2'>
                          <span className='font-medium'>
                            {format(date, "MMM d, yyyy")}
                          </span>
                          <span className='text-muted-foreground'>
                            {format(date, "EEE")}
                          </span>
                        </div>
                        <span>
                          {mockInvoice.currency}{" "}
                          {total.toLocaleString("en-KE", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                    <div className='py-2.5 text-center text-xs text-muted-foreground'>
                      …
                    </div>
                  </div>
                  <Separator className='mt-1' />
                  <div className='flex items-center justify-between py-3 text-xs'>
                    <span className='text-muted-foreground'>
                      {mockInvoice.recurringEnds ?
                        `Ends ${format(mockInvoice.recurringEnds, "MMM d, yyyy")}`
                      : "No end date"}
                    </span>
                    <span className='text-muted-foreground'>∞</span>
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {/* Activity */}
            <div className='px-5'>
              <CollapsibleSection title='Activity'>
                <div className='flex flex-col'>
                  <ActivityItem
                    label='Created'
                    date={mockInvoice.createdAt}
                    done
                  />
                  {mockInvoice.sentAt && (
                    <ActivityItem label='Sent' date={mockInvoice.sentAt} done />
                  )}
                  <ActivityItem
                    label='Paid'
                    date={mockInvoice.paidAt}
                    done={!!mockInvoice.paidAt}
                  />
                </div>
              </CollapsibleSection>
            </div>

            {/* Internal note */}
            <div className='px-5'>
              <CollapsibleSection title='Internal note' defaultOpen={false}>
                <Textarea
                  placeholder='Add a private note about this invoice — not visible to the client.'
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  className='text-xs'
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

function ActivityItem({
  label,
  date,
  done,
}: {
  label: string;
  date: Date | null;
  done: boolean;
}) {
  return (
    <div className='flex items-center gap-3 py-2.5 text-xs'>
      <div
        className={cn(
          "size-2 shrink-0 rounded-full",
          done ? "bg-foreground" : "border-2 border-muted-foreground/30",
        )}
      />
      <span className={cn("flex-1", !done && "text-muted-foreground")}>
        {label}
      </span>
      {date && (
        <span className='text-muted-foreground'>
          {format(date, "MMM d, HH:mm")}
        </span>
      )}
    </div>
  );
}
