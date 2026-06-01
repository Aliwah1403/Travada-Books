import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft01Icon,
  Cancel01Icon,
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@travada-books/ui/components/alert-dialog";
import {
  InvoiceStatusBadge,
  type InvoiceStatus,
} from "@/components/invoices/invoice-status-badge";
import { cn } from "@travada-books/ui/lib/utils";
import {
  getInvoice,
  updateInvoice,
  deleteInvoice,
  createInvoice,
  getNextInvoiceNumber,
} from "@/lib/queries/invoices";
import { lookupRate } from "@/lib/queries/exchange-rates";
import {
  getInvoiceRecurring,
  updateInvoiceRecurringStatus,
} from "@/lib/queries/invoice-recurring";
import { getCustomer } from "@/lib/queries/customers";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/shared/spinner";
import { InvoicePreview, InvoicePdf } from "@/components/invoice-templates";
import { downloadPdf } from "@/lib/pdf-download";
import { toast } from "sonner";

const RECURRING_LABELS: Record<string, string> = {
  one_time: "One time",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Every 3 months",
  yearly: "Yearly",
};


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

function ActivityItem({
  label,
  date,
  done,
}: {
  label: string;
  date: string | null;
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
          {format(new Date(date), "MMM d, HH:mm")}
        </span>
      )}
    </div>
  );
}

export function InvoiceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { orgId, org, user } = useAuth();
  const queryClient = useQueryClient();
  const [internalNote, setInternalNote] = useState("");
  const internalNoteDirtyRef = useRef(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  const {
    data: invoice,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  });

  const { data: customer } = useQuery({
    queryKey: ["customer", invoice?.customer_id],
    queryFn: () => getCustomer(invoice!.customer_id!, orgId!),
    enabled: !!invoice?.customer_id && !!orgId,
  });

  const { data: recurringSeries } = useQuery({
    queryKey: ["invoice-recurring", invoice?.invoice_recurring_id],
    queryFn: () => getInvoiceRecurring(invoice!.invoice_recurring_id!),
    enabled: !!invoice?.invoice_recurring_id,
  });

  const seriesMutation = useMutation({
    mutationFn: (status: "active" | "paused" | "canceled") =>
      updateInvoiceRecurringStatus(invoice!.invoice_recurring_id!, orgId!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-recurring", invoice?.invoice_recurring_id] });
    },
    onError: () => toast.error("Failed to update recurring series"),
  });

  useEffect(() => {
    if (invoice && !internalNoteDirtyRef.current) setInternalNote(invoice.internal_note ?? "");
  }, [invoice]);

  const updateMutation = useMutation({
    mutationFn: ({
      patch,
    }: {
      patch: Parameters<typeof updateInvoice>[2];
      label: string;
    }) => updateInvoice(id!, orgId!, patch),
    onMutate: ({
      label,
    }: {
      patch: Parameters<typeof updateInvoice>[2];
      label: string;
    }) => ({ label }),
    onSuccess: (_, __, context) => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId] });
      toast.success(context?.label);
    },
    onError: (_, __, context) => {
      toast.error(`Failed to ${context?.label?.toLowerCase()}`, {
        description: "Please try again.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteInvoice(id!, orgId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId] });
      toast.success("Invoice deleted");
      navigate("/invoices");
    },
    onError: () => {
      toast.error("Failed to delete invoice", {
        description: "Please try again.",
      });
    },
  });

  async function handleDuplicate() {
    const nextNumber = await getNextInvoiceNumber(
      orgId!,
      invoice!.customer_id!,
    );
    return createInvoice({
      org_id: orgId!,
      user_id: user!.id,
      customer_id: invoice!.customer_id!,
      customer_name: invoice!.customer_name,
      invoice_number: nextNumber,
      status: "draft",
      currency: invoice!.currency,
      issue_date: null,
      due_date: null,
      recurring: "one_time",
      line_items: invoice!.line_items,
      subtotal: invoice!.subtotal ?? 0,
      tax_amount: invoice!.tax_amount ?? 0,
      discount: invoice!.discount ?? 0,
      total: invoice!.total ?? 0,
      payment_details: invoice!.payment_details ?? "",
      note: invoice!.note ?? "",
      delivery_type: "none",
      scheduled_at: null,
      send_template_id: null,
      accept_payments: invoice!.accept_payments,
    });
  }

  const fromDetails =
    org ?
      {
        name: org.name,
        logo_url: org.logo_url ?? null,
        address_line1: org.address_line1 ?? null,
        address_line2: org.address_line2 ?? null,
        city: org.city ?? null,
        zip: org.zip ?? null,
        country_code: org.country_code ?? null,
        phone: org.phone ?? null,
        email: org.email ?? null,
        tax_id: org.tax_id ?? null,
      }
    : null;

  const customerDetails =
    customer ?
      {
        name: customer.name,
        email: customer.email ?? null,
        billing_email: customer.billing_email ?? null,
        phone: customer.phone ?? null,
        address_line1: customer.address_line1 ?? null,
        address_line2: customer.address_line2 ?? null,
        city: customer.city ?? null,
        zip: customer.zip ?? null,
        country: customer.country ?? null,
      }
    : null;

  function handleSaveNote() {
    updateMutation.mutate({
      patch: { internal_note: internalNote },
      label: "Note saved",
    });
  }

  async function handleSendInvoice() {
    try {
      const invoiceCurrency = invoice!.currency
      const baseCurrency = org?.base_currency ?? null
      let exchangeRate: number | null = null
      let convertedAmount: number | null = null
      if (baseCurrency) {
        exchangeRate = await lookupRate(invoiceCurrency, baseCurrency)
        convertedAmount = exchangeRate != null ? (invoice!.total ?? 0) * exchangeRate : null
      }
      await updateMutation.mutateAsync({
        patch: {
          status: "unpaid",
          sent_at: new Date().toISOString(),
          exchange_rate: exchangeRate,
          converted_amount: convertedAmount,
          base_currency: baseCurrency,
          ...(fromDetails && { from_details: fromDetails }),
          ...(customerDetails && { customer_details: customerDetails }),
        },
        label: "Invoice sent",
      });
      supabase.functions
        .invoke("send-invoice-email", { body: { invoiceId: id } })
        .then((res) => {
          if (res.error) {
            console.error("send-invoice-email failed:", res.error);
            toast.warning("Invoice sent, but email delivery failed. Try resending from the invoice.");
          }
        })
        .catch(() => {
          toast.warning("Invoice sent, but email delivery failed. Try resending from the invoice.");
        });
    } catch {
      // onError handles the toast
    }
  }

  function handleMarkPaid() {
    updateMutation.mutate(
      {
        patch: {
          status: "paid",
          paid_at: new Date().toISOString(),
          ...(!invoice!.from_details && fromDetails ?
            { from_details: fromDetails }
          : {}),
          ...(!invoice!.customer_details && customerDetails ?
            { customer_details: customerDetails }
          : {}),
        },
        label: "Invoice marked as paid",
      },
      {
        onSuccess: () => {
          supabase.functions
            .invoke("notify-invoice-paid", { body: { invoiceId: id } })
            .then((res) => {
              if (res.error) {
                console.error("notify-invoice-paid failed:", res.error);
                toast.warning("Invoice marked as paid, but the notification email failed to send.");
              }
            })
            .catch((err) => {
              console.error("notify-invoice-paid failed:", err);
              toast.warning("Invoice marked as paid, but the notification email failed to send.");
            });
        },
      },
    );
  }

  function handleCopyLink() {
    if (!invoice) return;
    navigator.clipboard.writeText(
      `${window.location.origin}/i/${invoice.token}`,
    );
    toast.success("Link copied to clipboard");
  }

  async function handleDownloadPdf() {
    if (!invoice) return;
    setIsPdfDownloading(true);
    try {
      await downloadPdf(
        <InvoicePdf
          data={documentData}
          invoiceTemplate={invoice.invoice_template}
        />,
        invoice.invoice_number ?? "Invoice",
      );
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setIsPdfDownloading(false);
    }
  }

  if (isLoading) {
    return (
      <div className='flex h-full flex-col overflow-hidden animate-pulse'>
        <div className='h-14 border-b' />
        <div className='flex-1 bg-muted/30' />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className='flex h-full items-center justify-center'>
        <p className='text-sm text-muted-foreground'>Invoice not found.</p>
      </div>
    );
  }

  const isRecurring = invoice.recurring !== "one_time";
  const status = invoice.status as InvoiceStatus;

  const documentData = {
    label: "INVOICE",
    number: invoice.invoice_number,
    currency: invoice.currency,
    issueDate: invoice.issue_date,
    secondaryDate: invoice.due_date,
    secondaryDateLabel: "Due date:",
    from: fromDetails ?? {},
    customer: customerDetails ?? { name: invoice.customer_name },
    customerLabel: "Bill To",
    lineItems: invoice.line_items,
    subtotal: invoice.subtotal,
    taxAmount: invoice.tax_amount,
    discount: invoice.discount,
    total: invoice.total,
    note: invoice.note,
    paymentDetails: invoice.payment_details,
    publicUrl:
      (
        invoice.token &&
        invoice.status !== "draft" &&
        invoice.status !== "scheduled"
      ) ?
        `${window.location.origin}/i/${invoice.token}`
      : null,
  };

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
            {invoice.invoice_number ?? "—"}
          </span>
          <InvoiceStatusBadge status={status} />
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            className='gap-1.5'
            onClick={handleDownloadPdf}
            disabled={isPdfDownloading}
          >
            <Download01Icon size={13} />
            {isPdfDownloading ? "Generating…" : "Download PDF"}
          </Button>
          <Button
            variant='outline'
            className='gap-1.5'
            onClick={handleCopyLink}
          >
            <Copy01Icon size={13} />
            Copy link
          </Button>
          {status === "draft" && (
            <Button
              variant='outline'
              className='gap-1.5'
              onClick={handleSendInvoice}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ?
                <Spinner size={13} />
              : <Sent02Icon size={13} />}
              {updateMutation.isPending ? "Sending…" : "Send Invoice"}
            </Button>
          )}
          {(status === "unpaid" || status === "overdue") && (
            <Button
              variant='outline'
              className='gap-1.5'
              onClick={handleMarkPaid}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ?
                <Spinner size={13} />
              : <Sent02Icon size={13} />}
              {updateMutation.isPending ? "Saving…" : "Mark as paid"}
            </Button>
          )}
          {status === "draft" && (
            <Button
              variant='outline'
              onClick={() => navigate(`/invoices/${id}/edit`)}
            >
              <PencilEdit01Icon size={13} />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant='outline' />}>
              <MoreHorizontalIcon size={13} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-full' sideOffset={10}>
              <DropdownMenuItem
                onClick={() => {
                  toast.promise(handleDuplicate(), {
                    loading: "Duplicating invoice…",
                    success: (newInvoice) => {
                      queryClient.invalidateQueries({
                        queryKey: ["invoices", orgId],
                      });
                      navigate(`/invoices/${newInvoice.id}/edit`);
                      return "Invoice duplicated";
                    },
                    error: "Failed to duplicate invoice",
                  });
                }}
              >
                <FileEditIcon size={13} />
                Duplicate
              </DropdownMenuItem>
              {status === "scheduled" && (
                <DropdownMenuItem
                  onClick={() => {
                    updateMutation.mutate({
                      patch: { status: "draft", scheduled_at: null },
                      label: "Schedule cancelled",
                    });
                  }}
                >
                  <Cancel01Icon size={13} />
                  Cancel schedule
                </DropdownMenuItem>
              )}
              {(status === "unpaid" || status === "overdue") && (
                <DropdownMenuItem
                  onClick={() => {
                    toast.promise(
                      supabase.functions
                        .invoke("send-invoice-reminder", { body: { invoiceId: id } })
                        .then((res) => { if (res.error) throw res.error; }),
                      {
                        loading: "Sending reminder…",
                        success: "Reminder sent",
                        error: "Failed to send reminder",
                      },
                    );
                  }}
                >
                  <Sent02Icon size={13} />
                  Send reminder
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={() => setDeleteOpen(true)}
                disabled={deleteMutation.isPending}
              >
                <Delete01Icon size={13} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{invoice.invoice_number}</strong> will be permanently
              deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant='destructive'
              onClick={() => {
                setDeleteOpen(false);
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scrollable content */}
      <div className='flex-1 overflow-y-auto bg-muted/30'>
        <div className='mx-auto flex max-w-2xl flex-col gap-0 px-4 py-8'>
          <InvoicePreview
            data={documentData}
            invoiceTemplate={invoice.invoice_template}
          />

          {/* Detail sections */}
          <div className='mt-4 rounded-lg border bg-background divide-y'>
            <div className='px-5'>
              <DetailRow
                label='Due date'
                value={
                  invoice.due_date ?
                    format(new Date(invoice.due_date), "dd/MM/yyyy")
                  : "—"
                }
              />
              <Separator />
              <DetailRow
                label='Issue date'
                value={
                  invoice.issue_date ?
                    format(new Date(invoice.issue_date), "dd/MM/yyyy")
                  : "—"
                }
              />
              <Separator />
              <DetailRow
                label='Invoice no.'
                value={invoice.invoice_number ?? "—"}
              />
              <Separator />
              <DetailRow
                label='Type'
                value={RECURRING_LABELS[invoice.recurring] ?? invoice.recurring}
              />
              {status === "scheduled" && invoice.scheduled_at && (
                <>
                  <Separator />
                  <DetailRow
                    label='Scheduled for'
                    value={format(
                      new Date(invoice.scheduled_at),
                      "dd/MM/yyyy 'at' HH:mm",
                    )}
                  />
                </>
              )}
            </div>

            {isRecurring && recurringSeries && (
              <div className='px-5'>
                <CollapsibleSection
                  title='Recurring Series'
                  badge={
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      recurringSeries.status === "active" && "bg-green-500/15 text-green-600 dark:text-green-400",
                      recurringSeries.status === "paused" && "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
                      recurringSeries.status === "completed" && "bg-muted text-muted-foreground",
                      recurringSeries.status === "canceled" && "bg-red-500/15 text-red-600 dark:text-red-400",
                    )}>
                      {recurringSeries.status.charAt(0).toUpperCase() + recurringSeries.status.slice(1)}
                    </span>
                  }
                >
                  <div className='flex flex-col gap-0'>
                    <div className='flex items-center justify-between py-2.5 text-xs'>
                      <span className='text-muted-foreground'>Frequency</span>
                      <span className='font-medium'>{RECURRING_LABELS[recurringSeries.frequency]}</span>
                    </div>
                    <div className='flex items-center justify-between py-2.5 text-xs'>
                      <span className='text-muted-foreground'>Invoices sent</span>
                      <span className='font-medium'>{recurringSeries.current_count}</span>
                    </div>
                    {recurringSeries.status === "active" && (
                      <div className='flex items-center justify-between py-2.5 text-xs'>
                        <span className='text-muted-foreground'>Next invoice</span>
                        <span className='font-medium'>
                          {format(new Date(recurringSeries.next_scheduled_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                    <div className='flex items-center justify-between py-2.5 text-xs'>
                      <span className='text-muted-foreground'>Ends</span>
                      <span className='font-medium'>
                        {recurringSeries.end_type === "on_date" && recurringSeries.end_on_date
                          ? format(new Date(recurringSeries.end_on_date), "MMM d, yyyy")
                          : recurringSeries.end_type === "after_count" && recurringSeries.end_after_count
                          ? `After ${recurringSeries.end_after_count} invoices`
                          : "Never"}
                      </span>
                    </div>
                    {recurringSeries.status !== "canceled" && recurringSeries.status !== "completed" && (
                      <>
                        <Separator className='mt-1' />
                        <div className='flex items-center gap-2 py-3'>
                          {recurringSeries.status === "active" ? (
                            <Button
                              size='sm'
                              variant='outline'
                              className='flex-1 text-xs'
                              onClick={() => toast.promise(seriesMutation.mutateAsync("paused"), {
                                loading: "Pausing series…",
                                success: "Series paused",
                                error: "Failed to pause series",
                              })}
                              disabled={seriesMutation.isPending}
                            >
                              Pause series
                            </Button>
                          ) : (
                            <Button
                              size='sm'
                              variant='outline'
                              className='flex-1 text-xs'
                              onClick={() => toast.promise(seriesMutation.mutateAsync("active"), {
                                loading: "Resuming series…",
                                success: "Series resumed",
                                error: "Failed to resume series",
                              })}
                              disabled={seriesMutation.isPending}
                            >
                              Resume series
                            </Button>
                          )}
                          <Button
                            size='sm'
                            variant='ghost'
                            className='flex-1 text-xs text-destructive hover:text-destructive'
                            onClick={() => toast.promise(seriesMutation.mutateAsync("canceled"), {
                              loading: "Canceling series…",
                              success: "Series canceled",
                              error: "Failed to cancel series",
                            })}
                            disabled={seriesMutation.isPending}
                          >
                            Cancel series
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </CollapsibleSection>
              </div>
            )}

            <div className='px-5'>
              <CollapsibleSection title='Activity'>
                <div className='flex flex-col'>
                  <ActivityItem
                    label='Created'
                    date={invoice.created_at}
                    done
                  />
                  <ActivityItem
                    label='Sent'
                    date={invoice.sent_at}
                    done={!!invoice.sent_at}
                  />
                  <ActivityItem
                    label='Paid'
                    date={invoice.paid_at}
                    done={!!invoice.paid_at}
                  />
                </div>
              </CollapsibleSection>
            </div>

            <div className='px-5'>
              <CollapsibleSection title='Internal note' defaultOpen={false}>
                <div className='flex flex-col gap-2'>
                  <Textarea
                    placeholder='Add a private note about this invoice — not visible to the client.'
                    value={internalNote}
                    onChange={(e) => { internalNoteDirtyRef.current = true; setInternalNote(e.target.value); }}
                    className='text-xs'
                    rows={3}
                  />
                  <Button
                    size='sm'
                    variant='outline'
                    className='self-end gap-1.5'
                    onClick={handleSaveNote}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending && <Spinner size={11} />}
                    {updateMutation.isPending ? "Saving…" : "Save note"}
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
