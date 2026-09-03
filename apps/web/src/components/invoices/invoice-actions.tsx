import { useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontalIcon } from "@travada-books/ui/icons";
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
import { Button } from "@travada-books/ui/components/button";
import { type InvoiceStatus } from "@/components/invoices/invoice-status-badge";
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog";
import {
  getInvoice,
  createInvoice,
  getNextInvoiceNumber,
  deleteInvoice,
} from "@/lib/queries/invoices";
import { createInvoicePayment } from "@/lib/queries/payments";
import { updateInvoiceRecurringStatus } from "@/lib/queries/invoice-recurring";
import { useAuth } from "@/contexts/auth-context";
import { useInvalidateAfterPaymentChange } from "@/hooks/use-invalidate-payment-queries";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { trackEvent, LogEvents } from "@/lib/analytics";

type InvoiceActionsProps = {
  invoiceId: string;
  status: InvoiceStatus;
  token: string;
  invoiceNumber?: string;
  seriesId?: string;
  seriesStatus?: "active" | "paused" | "completed" | "canceled";
  currency?: string;
  total?: number;
  amountPaid?: number;
};

export function InvoiceActions({
  invoiceId,
  status,
  token,
  invoiceNumber,
  seriesId,
  seriesStatus,
  currency,
  total,
  amountPaid,
}: InvoiceActionsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orgId, user } = useAuth();
  const invalidateAfterPaymentChange = useInvalidateAfterPaymentChange();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelSeriesOpen, setCancelSeriesOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const balanceDue = (total ?? 0) - (amountPaid ?? 0);

  async function handleDuplicate() {
    const invoice = await getInvoice(invoiceId);
    const nextNumber = await getNextInvoiceNumber(orgId!, invoice.customer_id!);
    return createInvoice({
      org_id: orgId!,
      user_id: user!.id,
      customer_id: invoice.customer_id!,
      customer_name: invoice.customer_name,
      invoice_number: nextNumber,
      status: "draft",
      currency: invoice.currency,
      issue_date: null,
      due_date: null,
      recurring: invoice.recurring,
      line_items: invoice.line_items,
      subtotal: invoice.subtotal ?? 0,
      tax_amount: invoice.tax_amount ?? 0,
      discount: invoice.discount ?? 0,
      total: invoice.total ?? 0,
      payment_details: invoice.payment_details ?? "",
      note: invoice.note ?? "",
      delivery_type: "none",
      scheduled_at: null,
      send_template_id: null,
      accept_payments: invoice.accept_payments,
    });
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["invoices", orgId] });
  }

  function invalidateSeries() {
    queryClient.invalidateQueries({
      queryKey: ["invoice-recurring", seriesId],
    });
  }

  if (seriesId) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant='ghost' size='icon-sm' />}
          >
            <MoreHorizontalIcon size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {seriesStatus === "active" && (
              <DropdownMenuItem
                onClick={() => {
                  toast.promise(
                    updateInvoiceRecurringStatus(
                      seriesId,
                      orgId!,
                      "paused",
                    ).then(invalidateSeries),
                    {
                      loading: "Pausing series…",
                      success: "Series paused",
                      error: "Failed to pause",
                    },
                  );
                }}
              >
                Pause
              </DropdownMenuItem>
            )}
            {seriesStatus === "paused" && (
              <DropdownMenuItem
                onClick={() => {
                  toast.promise(
                    updateInvoiceRecurringStatus(
                      seriesId,
                      orgId!,
                      "active",
                    ).then(invalidateSeries),
                    {
                      loading: "Resuming series…",
                      success: "Series resumed",
                      error: "Failed to resume",
                    },
                  );
                }}
              >
                Resume
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='text-destructive focus:text-destructive'
              onClick={() => setCancelSeriesOpen(true)}
            >
              Cancel series
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={cancelSeriesOpen} onOpenChange={setCancelSeriesOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel recurring series?</AlertDialogTitle>
              <AlertDialogDescription>
                No more invoices will be generated from this series. Invoices
                already sent are not affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep series</AlertDialogCancel>
              <Button
                variant='destructive'
                onClick={() => {
                  setCancelSeriesOpen(false);
                  toast.promise(
                    updateInvoiceRecurringStatus(
                      seriesId,
                      orgId!,
                      "canceled",
                    ).then(invalidateSeries),
                    {
                      loading: "Canceling series…",
                      success: "Series canceled",
                      error: "Failed to cancel",
                    },
                  );
                }}
              >
                Cancel series
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant='ghost' size='icon-sm' />}>
          <MoreHorizontalIcon size={14} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-full'>
          <DropdownMenuItem onClick={() => navigate(`/invoices/${invoiceId}`)}>
            View
          </DropdownMenuItem>
          {status === "draft" && (
            <DropdownMenuItem
              onClick={() => navigate(`/invoices/${invoiceId}/edit`)}
            >
              Edit
            </DropdownMenuItem>
          )}
          {status !== "paid" &&
            status !== "canceled" &&
            status !== "scheduled" && (
              <>
                <DropdownMenuItem onClick={() => setRecordPaymentOpen(true)}>
                  Record payment…
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    toast.promise(
                      createInvoicePayment({
                        org_id: orgId!,
                        invoice_id: invoiceId,
                        recorded_by: user?.id ?? null,
                        amount: balanceDue,
                        currency: currency ?? "",
                        paid_at: new Date().toISOString(),
                        method: "other",
                      }).then(() => {
                        trackEvent(LogEvents.InvoicePaid, {
                          invoice_number: invoiceNumber,
                        });
                        invalidate();
                        invalidateAfterPaymentChange(invoiceId);
                        supabase.functions
                          .invoke("notify-invoice-paid", {
                            body: { invoiceId },
                          })
                          .then((res) => {
                            if (res.error) {
                              console.error(
                                "notify-invoice-paid failed:",
                                res.error,
                              );
                              toast.warning(
                                "Invoice marked as paid, but the notification email failed to send.",
                              );
                            }
                          })
                          .catch((err) => {
                            console.error("notify-invoice-paid failed:", err);
                            toast.warning(
                              "Invoice marked as paid, but the notification email failed to send.",
                            );
                          });
                      }),
                      {
                        loading: "Marking as paid…",
                        success: "Invoice marked as paid",
                        error: "Failed to mark as paid",
                      },
                    );
                  }}
                >
                  Mark as paid
                </DropdownMenuItem>
              </>
            )}
          {(status === "unpaid" ||
            status === "overdue" ||
            status === "partially_paid") && (
            <DropdownMenuItem
              onClick={() => {
                toast.promise(
                  supabase.functions
                    .invoke("send-invoice-reminder", { body: { invoiceId } })
                    .then((res) => {
                      if (res.error) throw res.error;
                    }),
                  {
                    loading: "Sending reminder…",
                    success: "Reminder sent",
                    error: "Failed to send reminder",
                  },
                );
              }}
            >
              Send reminder
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => {
              toast.promise(handleDuplicate(), {
                loading: "Duplicating invoice…",
                success: (newInvoice) => {
                  invalidate();
                  navigate(`/invoices/${newInvoice.id}/edit`);
                  return "Invoice duplicated";
                },
                error: "Failed to duplicate invoice",
              });
            }}
          >
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/i/${token}`,
              );
              toast.success("Link copied to clipboard");
            }}
          >
            Copy link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className='text-destructive focus:text-destructive'
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              {invoiceNumber ?
                <>
                  <strong>{invoiceNumber}</strong> will be permanently deleted.
                  This cannot be undone.
                </>
              : "This invoice will be permanently deleted. This cannot be undone."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant='destructive'
              onClick={() => {
                setDeleteOpen(false);
                toast.promise(deleteInvoice(invoiceId, orgId!), {
                  loading: "Deleting invoice…",
                  success: () => {
                    invalidate();
                    return "Invoice deleted";
                  },
                  error: "Failed to delete invoice",
                });
              }}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RecordPaymentDialog
        open={recordPaymentOpen}
        onOpenChange={setRecordPaymentOpen}
        invoiceId={invoiceId}
        currency={currency ?? ""}
        balanceDue={balanceDue}
        onRecorded={(paidInFull) => {
          if (paidInFull)
            trackEvent(LogEvents.InvoicePaid, {
              invoice_number: invoiceNumber,
            });
          invalidate();
        }}
      />
    </>
  );
}
