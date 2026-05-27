import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@travada-books/ui/components/alert-dialog";
import { InvoiceStatusBadge, type InvoiceStatus } from "@/components/invoices/invoice-status-badge";
import { cn } from "@travada-books/ui/lib/utils";
import { getInvoice, updateInvoice, deleteInvoice, createInvoice, getNextInvoiceNumber } from "@/lib/queries/invoices";
import { getCustomer } from "@/lib/queries/customers";
import { useAuth } from "@/contexts/auth-context";
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

function getUpcomingDates(frequency: string, count = 3): Date[] {
  const base = new Date();
  const dates: Date[] = [];
  for (let i = 1; i <= count; i++) {
    switch (frequency) {
      case "weekly": dates.push(addWeeks(base, i)); break;
      case "biweekly": dates.push(addWeeks(base, i * 2)); break;
      case "monthly": dates.push(addMonths(base, i)); break;
      case "quarterly": dates.push(addMonths(base, i * 3)); break;
      case "yearly": dates.push(addYears(base, i)); break;
    }
  }
  return dates;
}

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
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-3 text-xs font-semibold"
      >
        <div className="flex items-center gap-2">
          {title}
          {badge}
        </div>
        <span className="text-muted-foreground text-base leading-none">{open ? "∧" : "∨"}</span>
      </button>
      {open && <div className="pb-3">{children}</div>}
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
    <div className="flex items-center gap-3 py-2.5 text-xs">
      <div
        className={cn(
          "size-2 shrink-0 rounded-full",
          done ? "bg-foreground" : "border-2 border-muted-foreground/30",
        )}
      />
      <span className={cn("flex-1", !done && "text-muted-foreground")}>{label}</span>
      {date && (
        <span className="text-muted-foreground">
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  });

  const { data: customer } = useQuery({
    queryKey: ["customer", invoice?.customer_id],
    queryFn: () => getCustomer(invoice!.customer_id!, orgId!),
    enabled: !!invoice?.customer_id && !!orgId,
  });

  useEffect(() => {
    if (invoice?.internal_note) setInternalNote(invoice.internal_note);
  }, [invoice]);

  const updateMutation = useMutation({
    mutationFn: ({ patch }: { patch: Parameters<typeof updateInvoice>[2]; label: string }) =>
      updateInvoice(id!, orgId!, patch),
    onMutate: ({ label }: { patch: Parameters<typeof updateInvoice>[2]; label: string }) => ({ label }),
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
      toast.error("Failed to delete invoice", { description: "Please try again." });
    },
  });

  async function handleDuplicate() {
    const nextNumber = await getNextInvoiceNumber(orgId!, invoice!.customer_id!)
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
      recurring: invoice!.recurring,
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
    })
  }

  const fromDetails = org
    ? {
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

  const customerDetails = customer
    ? {
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
    updateMutation.mutate({ patch: { internal_note: internalNote }, label: "Note saved" });
  }

  function handleSendInvoice() {
    updateMutation.mutate({
      patch: {
        status: "unpaid",
        sent_at: new Date().toISOString(),
        ...(fromDetails && { from_details: fromDetails }),
        ...(customerDetails && { customer_details: customerDetails }),
      },
      label: "Invoice sent",
    });
  }

  function handleMarkPaid() {
    updateMutation.mutate({
      patch: {
        status: "paid",
        paid_at: new Date().toISOString(),
        ...(!invoice!.from_details && fromDetails ? { from_details: fromDetails } : {}),
        ...(!invoice!.customer_details && customerDetails ? { customer_details: customerDetails } : {}),
      },
      label: "Invoice marked as paid",
    });
  }

  function handleCopyLink() {
    if (!invoice) return;
    navigator.clipboard.writeText(`${window.location.origin}/i/${invoice.token}`);
    toast.success("Link copied to clipboard");
  }

  async function handleDownloadPdf() {
    if (!invoice) return;
    setIsPdfDownloading(true);
    try {
      await downloadPdf(
        <InvoicePdf data={documentData} invoiceTemplate={invoice.invoice_template} />,
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
      <div className="flex h-full flex-col overflow-hidden animate-pulse">
        <div className="h-14 border-b" />
        <div className="flex-1 bg-muted/30" />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Invoice not found.</p>
      </div>
    );
  }

  const subtotal = invoice.line_items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  const tax = invoice.line_items.reduce(
    (sum, item) => sum + item.quantity * item.price * (item.tax_rate / 100),
    0,
  );
  const discount = invoice.discount ?? 0;
  const total = invoice.total ?? subtotal - discount + tax;

  const isRecurring = invoice.recurring !== "one_time";
  const upcomingDates = isRecurring ? getUpcomingDates(invoice.recurring) : [];
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
    publicUrl: invoice.token && invoice.status !== "draft" ? `${window.location.origin}/i/${invoice.token}` : null,
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex shrink-0 items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/invoices")}>
            <ArrowLeft01Icon size={14} />
          </Button>
          <span className="font-mono text-sm font-medium">
            {invoice.invoice_number ?? "—"}
          </span>
          <InvoiceStatusBadge status={status} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5" onClick={handleDownloadPdf} disabled={isPdfDownloading}>
            <Download01Icon size={13} />
            {isPdfDownloading ? "Generating…" : "Download PDF"}
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={handleCopyLink}>
            <Copy01Icon size={13} />
            Copy link
          </Button>
          {status !== "paid" && status !== "canceled" && (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={status === "draft" ? handleSendInvoice : handleMarkPaid}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Spinner size={13} />
              ) : (
                <Sent02Icon size={13} />
              )}
              {status === "draft"
                ? updateMutation.isPending ? "Sending…" : "Send Invoice"
                : updateMutation.isPending ? "Saving…" : "Mark as paid"}
            </Button>
          )}
          {status === "draft" && (
            <Button variant="outline" onClick={() => navigate(`/invoices/${id}/edit`)}>
              <PencilEdit01Icon size={13} />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              <MoreHorizontalIcon size={13} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  toast.promise(handleDuplicate(), {
                    loading: "Duplicating invoice…",
                    success: (newInvoice) => {
                      queryClient.invalidateQueries({ queryKey: ["invoices", orgId] })
                      navigate(`/invoices/${newInvoice.id}/edit`)
                      return "Invoice duplicated"
                    },
                    error: "Failed to duplicate invoice",
                  })
                }}
              >
                <FileEditIcon size={13} />
                Duplicate
              </DropdownMenuItem>
              {(status === "unpaid" || status === "overdue") && (
                <DropdownMenuItem>
                  <Sent02Icon size={13} />
                  Send reminder
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
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
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{invoice.invoice_number}</strong> will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => { setDeleteOpen(false); deleteMutation.mutate(); }}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-muted/30">
        <div className="mx-auto flex max-w-2xl flex-col gap-0 px-4 py-8">
          <InvoicePreview data={documentData} invoiceTemplate={invoice.invoice_template} />

          {/* Detail sections */}
          <div className="mt-4 rounded-lg border bg-background divide-y">
            <div className="px-5">
              <DetailRow
                label="Due date"
                value={invoice.due_date ? format(new Date(invoice.due_date), "dd/MM/yyyy") : "—"}
              />
              <Separator />
              <DetailRow
                label="Issue date"
                value={invoice.issue_date ? format(new Date(invoice.issue_date), "dd/MM/yyyy") : "—"}
              />
              <Separator />
              <DetailRow label="Invoice no." value={invoice.invoice_number ?? "—"} />
              <Separator />
              <DetailRow label="Type" value={RECURRING_LABELS[invoice.recurring] ?? invoice.recurring} />
            </div>

            {isRecurring && (
              <div className="px-5">
                <CollapsibleSection
                  title="Recurring Series"
                  badge={
                    <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                      Active
                    </span>
                  }
                >
                  <div className="flex flex-col divide-y">
                    {upcomingDates.map((date, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{format(date, "MMM d, yyyy")}</span>
                          <span className="text-muted-foreground">{format(date, "EEE")}</span>
                        </div>
                        <span>
                          {invoice.currency}{" "}
                          {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                    <div className="py-2.5 text-center text-xs text-muted-foreground">…</div>
                  </div>
                  <Separator className="mt-1" />
                  <div className="flex items-center justify-between py-3 text-xs">
                    <span className="text-muted-foreground">No end date</span>
                    <span className="text-muted-foreground">∞</span>
                  </div>
                </CollapsibleSection>
              </div>
            )}

            <div className="px-5">
              <CollapsibleSection title="Activity">
                <div className="flex flex-col">
                  <ActivityItem label="Created" date={invoice.created_at} done />
                  <ActivityItem label="Sent" date={invoice.sent_at} done={!!invoice.sent_at} />
                  <ActivityItem label="Paid" date={invoice.paid_at} done={!!invoice.paid_at} />
                </div>
              </CollapsibleSection>
            </div>

            <div className="px-5">
              <CollapsibleSection title="Internal note" defaultOpen={false}>
                <div className="flex flex-col gap-2">
                  <Textarea
                    placeholder="Add a private note about this invoice — not visible to the client."
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    className="text-xs"
                    rows={3}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="self-end gap-1.5"
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
