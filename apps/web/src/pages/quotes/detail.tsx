import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Skeleton } from "@travada-books/ui/components/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@travada-books/ui/components/alert-dialog";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { cn } from "@travada-books/ui/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  getQuote,
  sendQuote,
  deleteQuote,
  duplicateQuote,
  updateQuote,
} from "@/lib/queries/quotes";
import { getCustomer } from "@/lib/queries/customers";
import { supabase } from "@/lib/supabase";
import type { Invoice } from "@/lib/queries/invoices";
import { InvoicePdf } from "@/components/invoice-templates";
import { downloadPdf } from "@/lib/pdf-download";

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
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex w-full items-center justify-between py-3 text-xs font-semibold'
      >
        {title}
        <span className='text-muted-foreground text-base leading-none'>
          {open ? "∧" : "∨"}
        </span>
      </button>
      {open && <div className='pb-3'>{children}</div>}
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
  date: string | null;
  done: boolean;
  note?: string | null;
}) {
  return (
    <div className='flex items-start gap-3 py-2.5 text-xs'>
      <div
        className={cn(
          "mt-0.5 size-2 shrink-0 rounded-full",
          done ? "bg-foreground" : "border-2 border-muted-foreground/30",
        )}
      />
      <div className='flex-1'>
        <span className={cn(!done && "text-muted-foreground")}>{label}</span>
        {note && (
          <p className='mt-0.5 text-muted-foreground italic'>"{note}"</p>
        )}
      </div>
      {date && (
        <span className='shrink-0 text-muted-foreground'>
          {format(new Date(date), "MMM d, HH:mm")}
        </span>
      )}
    </div>
  );
}

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orgId, org, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [internalNoteSaved, setInternalNoteSaved] = useState(false);

  const {
    data: quote,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["quote", id],
    queryFn: () => getQuote(id!, orgId!),
    enabled: !!id && !!orgId,
  });

  useEffect(() => {
    if (quote) setInternalNote(quote.internal_note ?? "");
  }, [quote?.id, quote?.internal_note]);

  const { data: customer } = useQuery({
    queryKey: ["customer", quote?.customer_id],
    queryFn: () => getCustomer(quote!.customer_id, orgId!),
    enabled: !!quote?.customer_id && !!orgId,
  });

  // Fetch linked invoice if accepted
  const { data: linkedInvoice } = useQuery({
    queryKey: ["invoice-by-quote", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number")
        .eq("quote_id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as Pick<Invoice, "id" | "invoice_number"> | null;
    },
    enabled: !!id && quote?.status === "accepted",
  });

  const { mutate: handleSend, isPending: isSending } = useMutation({
    mutationFn: () => {
      if (!quote || !org || !orgId) throw new Error("Missing data");
      return sendQuote(
        quote.id,
        orgId,
        {
          name: org.name,
          logo_url: org.logo_url ?? null,
          address_line1: org.address_line1 ?? null,
          address_line2: org.address_line2 ?? null,
          city: org.city ?? null,
          country_code: org.country_code ?? null,
          phone: org.phone ?? null,
          email: org.email ?? null,
          tax_id: org.tax_id ?? null,
        },
        {
          name: customer?.name ?? quote.customer_name ?? "",
          email: customer?.email ?? null,
          billing_email: customer?.billing_email ?? null,
          phone: customer?.phone ?? null,
          address_line1: customer?.address_line1 ?? null,
          address_line2: customer?.address_line2 ?? null,
          city: customer?.city ?? null,
          zip: customer?.zip ?? null,
          country: customer?.country ?? null,
        },
        quote.sent_at,
      );
    },
    onSuccess: (sentQuote) => {
      queryClient.invalidateQueries({ queryKey: ["quote", id] });
      queryClient.invalidateQueries({ queryKey: ["quotes", orgId] });
      toast.success(quote?.sent_at ? "Quote resent" : "Quote sent");
      supabase.functions.invoke("send-quote-email", { body: { quoteId: sentQuote.id } }).catch(() => {
        toast.warning("Quote sent, but email delivery failed.");
      });
    },
    onError: () => toast.error("Failed to send quote"),
  });

  const { mutate: handleDuplicate } = useMutation({
    mutationFn: () => {
      if (!quote || !orgId || !user) throw new Error("Missing data");
      return duplicateQuote(quote, orgId, user.id);
    },
    onSuccess: (newQuote) => {
      queryClient.invalidateQueries({ queryKey: ["quotes", orgId] });
      toast.success("Quote duplicated");
      navigate(`/quotes/${newQuote.id}`);
    },
    onError: () => toast.error("Failed to duplicate quote"),
  });

  const { mutate: handleDelete } = useMutation({
    mutationFn: () => deleteQuote(id!, orgId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes", orgId] });
      navigate("/quotes");
      toast.success("Quote deleted");
    },
    onError: () => toast.error("Failed to delete quote"),
  });

  async function handleDownloadPdf() {
    if (!quote) return;
    setIsPdfDownloading(true);
    try {
      const from = (quote.from_details ?? {}) as Record<string, string | null>;
      const customerSnap = (quote.customer_details ?? {}) as Record<string, string | null>;
      const documentData = {
        label: "QUOTATION",
        number: quote.quote_number,
        currency: quote.currency,
        issueDate: quote.issue_date,
        secondaryDate: quote.valid_until,
        secondaryDateLabel: "Valid until:",
        from: {
          name: from["name"] ?? org?.name,
          logo_url: from["logo_url"] ?? org?.logo_url,
          address_line1: from["address_line1"] ?? org?.address_line1,
          address_line2: from["address_line2"] ?? org?.address_line2,
          city: from["city"] ?? org?.city,
          zip: from["zip"] ?? org?.zip,
          country_code: from["country_code"] ?? org?.country_code,
          phone: from["phone"] ?? org?.phone,
          email: from["email"] ?? org?.email,
          tax_id: from["tax_id"] ?? org?.tax_id,
        },
        customer: {
          name: customerSnap["name"] ?? customer?.name ?? quote.customer_name,
          email: customerSnap["email"] ?? customer?.email,
          billing_email: customerSnap["billing_email"] ?? customer?.billing_email,
          phone: customerSnap["phone"] ?? customer?.phone,
          address_line1: customerSnap["address_line1"] ?? customer?.address_line1,
          address_line2: customerSnap["address_line2"] ?? customer?.address_line2,
          city: customerSnap["city"] ?? customer?.city,
          zip: customerSnap["zip"] ?? customer?.zip,
          country: customerSnap["country"] ?? customer?.country,
        },
        customerLabel: "Prepared For",
        lineItems: quote.line_items,
        subtotal: quote.subtotal,
        taxAmount: quote.tax_amount,
        discount: quote.discount,
        total: quote.total,
        note: quote.note,
        publicUrl: quote.token && quote.status !== "draft" ? `${window.location.origin}/q/${quote.token}` : null,
      };
      await downloadPdf(
        <InvoicePdf data={documentData} />,
        quote.quote_number ?? "Quote",
      );
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setIsPdfDownloading(false);
    }
  }

  const { mutate: saveInternalNote } = useMutation({
    mutationFn: () => updateQuote(id!, orgId!, { internal_note: internalNote || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote", id] });
      setInternalNoteSaved(true);
      setTimeout(() => setInternalNoteSaved(false), 2000);
    },
    onError: () => toast.error("Failed to save note"),
  });

  if (isLoading) {
    return (
      <div className='flex h-full flex-col'>
        <div className='flex shrink-0 items-center gap-3 border-b px-6 py-3'>
          <Skeleton className='h-7 w-7 rounded' />
          <Skeleton className='h-4 w-28' />
        </div>
        <div className='flex-1 overflow-y-auto bg-muted/30'>
          <div className='mx-auto max-w-2xl px-4 py-8 space-y-4'>
            <Skeleton className='h-96 rounded-lg' />
            <Skeleton className='h-32 rounded-lg' />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !quote) {
    return (
      <div className='flex h-full items-center justify-center'>
        <p className='text-sm text-muted-foreground'>Quote not found.</p>
      </div>
    );
  }

  const items = (quote.line_items ?? []) as Array<{
    description: string;
    quantity: number;
    price: number;
    tax_rate: number;
  }>;

  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const tax = items.reduce(
    (s, i) => s + i.quantity * i.price * (i.tax_rate / 100),
    0,
  );
  const discount = quote.discount ?? 0;
  const total = subtotal + tax - discount;

  const customerName = customer?.name ?? quote.customer_name ?? "Customer";
  const customerEmail = customer?.billing_email ?? customer?.email ?? null;

  const quoteUrl = `${window.location.origin}/q/${quote.token}`;
  // Accepted and expired are fully terminal. Declined can be revised and resent.
  const isTerminal =
    quote.status === "accepted" || quote.status === "expired";
  const isEditable =
    quote.status === "draft" || quote.status === "declined";

  function handleCopyLink() {
    navigator.clipboard.writeText(quoteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard");
  }

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      {/* Page header */}
      <div className='flex shrink-0 items-center justify-between border-b px-6 py-3'>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={() => navigate("/quotes")}
          >
            <ArrowLeft01Icon size={14} />
          </Button>
          <span className='font-mono text-sm font-medium'>
            {quote.quote_number ?? "—"}
          </span>
          <QuoteStatusBadge status={quote.status} />
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' className='gap-1.5' onClick={handleDownloadPdf} disabled={isPdfDownloading}>
            <Download01Icon size={13} />
            {isPdfDownloading ? "Generating…" : "Download PDF"}
          </Button>
          <Button
            variant='outline'
            className='gap-1.5'
            onClick={handleCopyLink}
          >
            <Copy01Icon size={13} />
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          {(quote.status === "draft" || quote.status === "declined") && (
            <Button
              variant='outline'
              className='gap-1.5'
              onClick={() => handleSend()}
              disabled={isSending}
            >
              <Sent02Icon size={13} />
              {quote.status === "declined" ? "Resend Quote" : "Send Quote"}
            </Button>
          )}
          {isEditable && (
            <Button
              variant='outline'
              onClick={() => navigate(`/quotes/${quote.id}/edit`)}
            >
              <PencilEdit01Icon size={13} />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant='outline' />}>
              <MoreHorizontalIcon size={13} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => handleDuplicate()}>
                <FileEditIcon size={13} />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={() => setDeleteOpen(true)}
              >
                <Delete01Icon size={13} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size='sm'>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete quote?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{quote.quote_number}</strong> will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant='destructive'
              onClick={() => { setDeleteOpen(false); handleDelete(); }}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scrollable content */}
      <div className='flex-1 overflow-y-auto bg-muted/30'>
        <div className='mx-auto flex max-w-2xl flex-col gap-0 px-4 py-8'>
          {/* Accepted banner */}
          {quote.status === "accepted" && linkedInvoice && (
            <div className='mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs dark:border-green-900/40 dark:bg-green-900/20'>
              <div className='flex items-center gap-2 text-green-700 dark:text-green-400'>
                <Invoice01Icon size={14} />
                <span>
                  Invoice{" "}
                  <span className='font-mono font-semibold'>
                    {linkedInvoice.invoice_number ?? "draft"}
                  </span>{" "}
                  was created from this quote.
                </span>
              </div>
              <Link
                to={`/invoices/${linkedInvoice.id}`}
                className='font-medium text-green-700 underline underline-offset-2 hover:text-green-800 dark:text-green-400'
              >
                View Invoice
              </Link>
            </div>
          )}

          {/* Accepted, no invoice yet */}
          {quote.status === "accepted" && !linkedInvoice && (
            <div className='mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-400'>
              Quote accepted — draft invoice is being created.
            </div>
          )}

          {/* Declined banner */}
          {quote.status === "declined" && (
            <div className='mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs dark:border-red-900/40 dark:bg-red-900/20'>
              <p className='font-medium text-red-700 dark:text-red-400'>
                Quote declined
              </p>
              {quote.decline_reason && (
                <p className='mt-1 text-red-600/80 italic dark:text-red-400/70'>
                  "{quote.decline_reason}"
                </p>
              )}
            </div>
          )}

          {/* Quote document */}
          <div className='rounded-lg border bg-white p-10 text-sm shadow-sm dark:bg-card'>
            {/* Letterhead */}
            <div className='flex items-start justify-between'>
              <div>
                {org?.logo_url ?
                  <img
                    src={org.logo_url}
                    alt={org.name}
                    className='h-9 w-auto max-w-[140px] object-contain'
                  />
                : <div className='flex size-9 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold'>
                    {(org?.name ?? "TB").slice(0, 2).toUpperCase()}
                  </div>
                }
                <div className='mt-2 space-y-0.5'>
                  <p className='font-semibold text-foreground'>
                    {org?.name ?? "Your Business"}
                  </p>
                  {org?.address_line1 && (
                    <p className='text-xs text-muted-foreground'>
                      {org.address_line1}
                    </p>
                  )}
                  {org?.address_line2 && (
                    <p className='text-xs text-muted-foreground'>
                      {org.address_line2}
                    </p>
                  )}
                  {(org?.city || org?.zip) && (
                    <p className='text-xs text-muted-foreground'>
                      {[org.city, org.zip].filter(Boolean).join(" ")}
                    </p>
                  )}
                  {org?.phone && (
                    <p className='text-xs text-muted-foreground'>
                      {org.phone}
                    </p>
                  )}
                  {org?.email && (
                    <p className='text-xs text-muted-foreground'>
                      {org.email}
                    </p>
                  )}
                  {org?.tax_id && (
                    <p className='text-xs text-muted-foreground'>
                      PIN: {org.tax_id}
                    </p>
                  )}
                </div>
              </div>
              <div className='text-right'>
                <p className='text-2xl font-bold text-foreground'>QUOTATION</p>
                <p className='text-xs text-muted-foreground'>
                  {quote.quote_number}
                </p>
              </div>
            </div>

            <Separator className='my-6' />

            <div className='grid grid-cols-2 gap-6'>
              <div>
                <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                  Prepared For
                </p>
                <div className='mt-1.5 space-y-0.5'>
                  <p className='font-medium text-foreground'>{customerName}</p>
                  {customer?.address_line1 && (
                    <p className='text-xs text-muted-foreground'>
                      {customer.address_line1}
                    </p>
                  )}
                  {customer?.address_line2 && (
                    <p className='text-xs text-muted-foreground'>
                      {customer.address_line2}
                    </p>
                  )}
                  {(customer?.city || customer?.zip) && (
                    <p className='text-xs text-muted-foreground'>
                      {[customer.city, customer.zip].filter(Boolean).join(" ")}
                    </p>
                  )}
                  {customer?.country && (
                    <p className='text-xs text-muted-foreground'>
                      {customer.country}
                    </p>
                  )}
                  {customer?.phone && (
                    <p className='text-xs text-muted-foreground'>
                      {customer.phone}
                    </p>
                  )}
                  {customerEmail && (
                    <p className='text-xs text-muted-foreground'>
                      {customerEmail}
                    </p>
                  )}
                </div>
              </div>
              <div className='space-y-1'>
                <div className='flex justify-between text-xs'>
                  <span className='text-muted-foreground'>Issue date:</span>
                  <span className='font-medium'>
                    {quote.issue_date ?
                      format(new Date(quote.issue_date), "dd/MM/yyyy")
                    : "—"}
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='text-muted-foreground'>Valid until:</span>
                  <span className='font-medium'>
                    {quote.valid_until ?
                      format(new Date(quote.valid_until), "dd/MM/yyyy")
                    : "—"}
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='text-muted-foreground'>Currency:</span>
                  <span className='font-medium'>{quote.currency}</span>
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
                {items.map((item, i) => (
                  <tr key={i} className='border-b border-dashed'>
                    <td className='py-3'>{item.description}</td>
                    <td className='py-3 text-right'>{item.quantity}</td>
                    <td className='py-3 text-right'>
                      {quote.currency} {item.price.toLocaleString("en-KE")}
                    </td>
                    <td className='py-3 text-right'>{item.tax_rate}%</td>
                    <td className='py-3 text-right font-medium'>
                      {quote.currency}{" "}
                      {(
                        item.quantity *
                        item.price *
                        (1 + item.tax_rate / 100)
                      ).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className='mt-5 flex flex-col items-end gap-1.5 text-xs'>
              <div className='flex w-48 justify-between'>
                <span className='text-muted-foreground'>Subtotal</span>
                <span>
                  {quote.currency}{" "}
                  {subtotal.toLocaleString("en-KE", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              {tax > 0 && (
                <div className='flex w-48 justify-between'>
                  <span className='text-muted-foreground'>Tax</span>
                  <span>
                    {quote.currency}{" "}
                    {tax.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {discount > 0 && (
                <div className='flex w-48 justify-between text-green-600 dark:text-green-400'>
                  <span>Discount</span>
                  <span>
                    − {quote.currency}{" "}
                    {discount.toLocaleString("en-KE", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
              <Separator className='my-1 w-48' />
              <div className='flex w-48 justify-between text-sm font-semibold'>
                <span>Total</span>
                <span>
                  {quote.currency}{" "}
                  {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {quote.note && (
              <>
                <Separator className='my-6' />
                <div>
                  <p className='text-xs font-medium'>Notes</p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {quote.note}
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
            <div className='px-5'>
              <DetailRow
                label='Valid until'
                value={
                  quote.valid_until ?
                    format(new Date(quote.valid_until), "dd/MM/yyyy")
                  : "—"
                }
              />
              <Separator />
              <DetailRow
                label='Issue date'
                value={
                  quote.issue_date ?
                    format(new Date(quote.issue_date), "dd/MM/yyyy")
                  : "—"
                }
              />
              <Separator />
              <DetailRow label='Quote no.' value={quote.quote_number ?? "—"} />
            </div>

            {/* Activity */}
            <div className='px-5'>
              <CollapsibleSection title='Activity'>
                <div className='flex flex-col'>
                  <ActivityItem label='Created' date={quote.created_at} done />
                  {quote.sent_at && (
                    <ActivityItem label='Sent' date={quote.sent_at} done />
                  )}
                  {quote.declined_at && (
                    <ActivityItem
                      label='Declined'
                      date={quote.declined_at}
                      done
                      note={quote.decline_reason}
                    />
                  )}
                  {quote.resent_at && (
                    <ActivityItem label='Resent' date={quote.resent_at} done />
                  )}
                  {quote.accepted_at && (
                    <ActivityItem
                      label='Accepted'
                      date={quote.accepted_at}
                      done
                    />
                  )}
                  {!quote.accepted_at &&
                    !quote.declined_at &&
                    quote.status === "sent" && (
                      <ActivityItem
                        label='Awaiting response'
                        date={null}
                        done={false}
                      />
                    )}
                  {quote.declined_at &&
                    quote.resent_at &&
                    !quote.accepted_at && (
                      <ActivityItem
                        label='Awaiting response'
                        date={null}
                        done={false}
                      />
                    )}
                </div>
              </CollapsibleSection>
            </div>

            {/* Internal note */}
            <div className='px-5'>
              <CollapsibleSection title='Internal note' defaultOpen={false}>
                <div className='flex flex-col gap-2'>
                  <Textarea
                    placeholder='Add a private note — not visible to the client.'
                    value={internalNote}
                    onChange={(e) => {
                      setInternalNote(e.target.value);
                      setInternalNoteSaved(false);
                    }}
                    className='text-xs'
                    rows={3}
                  />
                  <Button
                    size='sm'
                    variant='outline'
                    className='w-fit'
                    onClick={() => saveInternalNote()}
                  >
                    {internalNoteSaved ? "Saved" : "Save note"}
                  </Button>
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
