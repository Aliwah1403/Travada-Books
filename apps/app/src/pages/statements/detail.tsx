import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft01Icon,
  Copy01Icon,
  Delete01Icon,
  Download01Icon,
  MoreHorizontalIcon,
  Sent02Icon,
} from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Separator } from "@travada-books/ui/components/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { cn } from "@travada-books/ui/lib/utils";
import { getStatement, deleteStatement } from "@/lib/queries/statements";
import { useAuth } from "@/contexts/auth-context";
import { useFormatDate } from "@/hooks/use-format-date";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { downloadPdf } from "@/lib/pdf-download";
import { StatementPdf, buildStatementDocumentData, buildStatementLedger } from "@travada-books/pdf";
import { EmailDeliveryNotice } from "@/components/shared/email-delivery-notice";

function fmt(n: number, currency: string) {
  return `${currency} ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-center justify-between py-3 text-xs'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='font-medium'>{value}</span>
    </div>
  );
}

export function StatementDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { orgId } = useAuth();
  const { formatDate, formatDateTime } = useFormatDate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const [isRetryingEmail, setIsRetryingEmail] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: statement,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["statement", id],
    queryFn: () => getStatement(id!, orgId!),
    enabled: !!id && !!orgId,
    // The PDF-attach send flow queues a background render (see
    // DOCUMENT-PDF-PLAN.md) — poll gently while it's in flight so the
    // "still sending" notice clears on its own once the callback lands.
    refetchInterval: (query) => (query.state.data?.email_status === "queued" ? 5000 : false),
  });

  function handleCopyLink() {
    if (!statement) return;
    const url = `${window.location.origin}/s/${statement.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Shared by the send button below and the "Try again" retry on the failed-
  // delivery notice — invalidates the statement query either way so
  // email_status (and the notice/poll driven by it) reflect the outcome.
  async function dispatchStatementEmail(): Promise<{ queued: boolean }> {
    const res = await supabase.functions.invoke("send-statement-email", { body: { statementId: id } });
    queryClient.invalidateQueries({ queryKey: ["statement", id] });
    if (res.error) throw res.error;
    return { queued: !!(res.data as { queued?: boolean } | null)?.queued };
  }

  function handleSend() {
    if (isSending || hasSent || !id) return;
    setIsSending(true);
    toast.promise(dispatchStatementEmail(), {
      loading: "Sending…",
      success: ({ queued }) => {
        setHasSent(true);
        setIsSending(false);
        return queued
          ? "Statement sent. Emailing it to the customer with the PDF attached…"
          : "Statement sent by email";
      },
      error: () => {
        setIsSending(false);
        return "Failed to send email";
      },
    });
  }

  async function handleRetryEmail() {
    setIsRetryingEmail(true);
    try {
      const { queued } = await dispatchStatementEmail();
      setHasSent(true);
      toast.success(queued ? "Emailing it to the customer with the PDF attached…" : "Email sent");
    } catch (err) {
      console.error("send-statement-email retry failed:", err);
      toast.error("Failed to resend the email", { description: "Please try again." });
    } finally {
      setIsRetryingEmail(false);
    }
  }

  async function handleDownloadPdf() {
    if (!statement) return;
    setIsPdfDownloading(true);
    try {
      const from = (statement.from_details ?? {}) as Record<string, string | null>;
      const customer = (statement.customer_details ?? {}) as Record<string, string | null>;
      const snap = statement.snapshot_data ?? [];
      const cur = snap[0]?.currency ?? statement.payments_snapshot?.[0]?.currency ?? "KES";
      const ledger = buildStatementLedger(snap, {
        dateTo: statement.date_to,
        formatDate,
        openingBalance: statement.opening_balance,
        payments: statement.payments_snapshot,
      });
      const data = buildStatementDocumentData({
        currency: cur,
        from,
        customer,
        statementDate: formatDate(statement.created_at),
        dateFrom: formatDate(statement.date_from),
        dateTo: formatDate(statement.date_to),
        entries: ledger,
        notes: statement.notes ?? null,
        publicUrl: statement.token ? `${window.location.origin}/s/${statement.token}` : null,
        openingBalance: statement.opening_balance,
      });
      await downloadPdf(
        <StatementPdf data={data} />,
        `Statement — ${customer.name ?? "Customer"}`,
      );
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setIsPdfDownloading(false);
    }
  }

  async function handleDelete() {
    if (!statement || !orgId || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteStatement(statement.id, orgId);
      queryClient.invalidateQueries({ queryKey: ["customer-statements", statement.customer_id] });
      toast.success("Statement deleted");
      navigate(`/customers/${statement.customer_id}`);
    } catch {
      toast.error("Failed to delete statement", { description: "Please try again." });
      setIsDeleting(false);
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

  if (isError || !statement) {
    return (
      <div className='flex h-full items-center justify-center'>
        <p className='text-sm text-muted-foreground'>Statement not found.</p>
      </div>
    );
  }

  const fromDetails = statement.from_details as Record<
    string,
    string | null
  > | null;
  const customerDetails = statement.customer_details as Record<
    string,
    string | null
  > | null;
  const snapshot = statement.snapshot_data ?? [];
  const currency = snapshot[0]?.currency ?? statement.payments_snapshot?.[0]?.currency ?? "KES";
  const openingBalance = statement.opening_balance ?? 0;
  const entries = buildStatementLedger(snapshot, {
    dateTo: statement.date_to,
    formatDate,
    openingBalance,
    payments: statement.payments_snapshot,
  });
  const totalDebits = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredits = entries.reduce((s, e) => s + e.credit, 0);
  const closingBalance = openingBalance + totalDebits - totalCredits;
  const periodLabel = `${formatDate(statement.date_from)} – ${formatDate(statement.date_to)}`;

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      {/* Header bar */}
      <div className='flex shrink-0 items-center justify-between border-b px-6 py-3'>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={() => navigate(`/customers/${statement.customer_id}`)}
          >
            <ArrowLeft01Icon size={14} />
          </Button>
          <span className='text-sm font-medium'>{periodLabel}</span>
          <span className='rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground'>
            Statement
          </span>
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
            {copied ? "Copied!" : "Copy link"}
          </Button>
          <Button
            variant='outline'
            className='gap-1.5'
            onClick={handleSend}
            disabled={isSending || hasSent}
          >
            <Sent02Icon size={13} />
            {hasSent ? "Sent" : "Send to client"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant='outline' />}>
              <MoreHorizontalIcon size={13} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
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

      {/* Scrollable content */}
      <div className='flex-1 overflow-y-auto bg-muted/30'>
        <div className='mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8'>
          <EmailDeliveryNotice
            key={`${statement.email_status ?? "none"}-${statement.email_status_at ?? "none"}`}
            status={statement.email_status}
            statusAt={statement.email_status_at}
            recipient={customerDetails?.billing_email ?? customerDetails?.email}
            error={statement.email_error}
            onRetry={handleRetryEmail}
            retrying={isRetryingEmail}
          />

          {/* Statement document */}
          <div className='rounded-lg border bg-white p-10 text-sm shadow-sm dark:bg-card'>
            {/* Letterhead */}
            <div className='flex items-start justify-between'>
              <div>
                {fromDetails?.logo_url ?
                  <img
                    src={fromDetails.logo_url}
                    alt={fromDetails.name ?? ""}
                    className='h-9 w-auto object-contain'
                  />
                : <div className='flex size-9 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold'>
                    {(fromDetails?.name ?? "TB").slice(0, 2).toUpperCase()}
                  </div>
                }
                <p className='mt-2 font-semibold text-foreground'>
                  {fromDetails?.name ?? ""}
                </p>
                {fromDetails?.city && (
                  <p className='text-xs text-muted-foreground'>
                    {fromDetails.city}
                  </p>
                )}
              </div>
              <div className='text-right'>
                <p className='text-2xl font-bold text-foreground'>STATEMENT</p>
                <p className='text-xs text-muted-foreground'>{periodLabel}</p>
              </div>
            </div>

            <Separator className='my-6' />

            {/* Bill to + period */}
            <div className='grid grid-cols-2 gap-6'>
              <div>
                <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                  Prepared for
                </p>
                <p className='mt-1.5 font-medium text-foreground'>
                  {customerDetails?.name ?? ""}
                </p>
                {(customerDetails?.billing_email ?? customerDetails?.email) && (
                  <p className='text-xs text-muted-foreground'>
                    {customerDetails?.billing_email ?? customerDetails?.email}
                  </p>
                )}
              </div>
              <div className='space-y-1'>
                <div className='flex justify-between text-xs'>
                  <span className='text-muted-foreground'>Statement date:</span>
                  <span className='font-medium'>
                    {formatDate(statement.created_at)}
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='text-muted-foreground'>Period from:</span>
                  <span className='font-medium'>
                    {formatDate(statement.date_from)}
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='text-muted-foreground'>Period to:</span>
                  <span className='font-medium'>
                    {formatDate(statement.date_to)}
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='text-muted-foreground'>Currency:</span>
                  <span className='font-medium'>{currency}</span>
                </div>
              </div>
            </div>

            <Separator className='my-6' />

            {/* Ledger table */}
            <table className='w-full text-xs'>
              <thead>
                <tr className='border-b text-muted-foreground'>
                  <th className='pb-3 text-left font-medium'>Date</th>
                  <th className='pb-3 text-left font-medium'>Description</th>
                  <th className='pb-3 text-left font-medium'>Invoice #</th>
                  <th className='pb-3 text-right font-medium'>Charges</th>
                  <th className='pb-3 text-right font-medium'>Payments</th>
                  <th className='pb-3 text-right font-medium'>Balance</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening balance row */}
                <tr className='border-b border-dashed bg-muted/30'>
                  <td className='py-2.5 text-muted-foreground'>—</td>
                  <td className='py-2.5 font-medium' colSpan={2}>
                    Opening balance
                  </td>
                  <td className='py-2.5 text-right text-muted-foreground'>—</td>
                  <td className='py-2.5 text-right text-muted-foreground'>—</td>
                  <td className='py-2.5 text-right font-medium'>
                    {fmt(openingBalance, currency)}
                  </td>
                </tr>

                {entries.length === 0 ?
                  <tr>
                    <td
                      colSpan={6}
                      className='py-6 text-center text-muted-foreground'
                    >
                      No invoices in this period.
                    </td>
                  </tr>
                : entries.map((entry, i) => (
                    <tr key={i} className='border-b border-dashed'>
                      <td className='py-2.5 text-muted-foreground'>
                        {entry.date}
                      </td>
                      <td className='py-2.5'>{entry.description}</td>
                      <td className='py-2.5 font-mono text-muted-foreground'>
                        {entry.invoiceNumber ?? "—"}
                      </td>
                      <td className='py-2.5 text-right'>
                        {entry.debit > 0 ?
                          fmt(entry.debit, currency)
                        : <span className='text-muted-foreground'>—</span>}
                      </td>
                      <td className='py-2.5 text-right text-green-600 dark:text-green-400'>
                        {entry.credit > 0 ?
                          fmt(entry.credit, currency)
                        : <span className='text-muted-foreground'>—</span>}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 text-right font-medium",
                          entry.balance > 0 && "text-red-600 dark:text-red-400",
                        )}
                      >
                        {fmt(entry.balance, currency)}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>

            {/* Summary */}
            <div className='mt-6 flex flex-col items-end gap-1.5 text-xs'>
              <div className='flex w-56 justify-between'>
                <span className='text-muted-foreground'>Total charges</span>
                <span>{fmt(totalDebits, currency)}</span>
              </div>
              <div className='flex w-56 justify-between'>
                <span className='text-muted-foreground'>Total payments</span>
                <span className='text-green-600 dark:text-green-400'>
                  {fmt(totalCredits, currency)}
                </span>
              </div>
              <Separator className='my-1 w-56' />
              <div className='flex w-56 justify-between text-sm font-semibold'>
                <span>Closing balance</span>
                <span
                  className={cn(
                    closingBalance > 0 && "text-red-600 dark:text-red-400",
                  )}
                >
                  {fmt(closingBalance, currency)}
                </span>
              </div>
            </div>

            {statement.notes && (
              <>
                <Separator className='my-6' />
                <div>
                  <p className='text-xs font-medium'>Notes</p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {statement.notes}
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

          {/* Meta panel */}
          <div className='rounded-lg border bg-background divide-y'>
            <div className='px-5'>
              <DetailRow label='Period' value={periodLabel} />
              <Separator />
              <DetailRow
                label='Generated'
                value={formatDateTime(statement.created_at)}
              />
              <Separator />
              <DetailRow
                label='Customer'
                value={customerDetails?.name ?? "—"}
              />
              <Separator />
              <DetailRow
                label='Invoices in period'
                value={String(snapshot.length)}
              />
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size='sm'>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete statement?</AlertDialogTitle>
            <AlertDialogDescription>
              This statement for <strong>{periodLabel}</strong> will be
              permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant='destructive'
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
