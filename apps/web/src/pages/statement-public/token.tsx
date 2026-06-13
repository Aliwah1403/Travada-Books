import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isValid } from "date-fns";
import { useState } from "react";
import { Copy01Icon, Download01Icon } from "@travada-books/ui/icons";
import { Spokes } from "@travada-books/ui/components/spokes";
import { Button } from "@travada-books/ui/components/button";
import { Separator } from "@travada-books/ui/components/separator";
import { cn } from "@travada-books/ui/lib/utils";
import { useTheme } from "@/components/theme-provider";
import {
  getStatementByToken,
  type StatementInvoiceRow,
} from "@/lib/queries/statements";
import { StatementPdf } from "@/components/statement-templates/default/pdf";
import { downloadPdf } from "@/lib/pdf-download";
import LogoGreen from "@/assets/Logo-Green.svg";
import LogoLime from "@/assets/Logo-Lime.svg";
import { toast } from "sonner";

type LedgerEntry = {
  date: string;
  description: string;
  invoiceNumber: string | null;
  debit: number;
  credit: number;
  balance: number;
  currency: string;
};

function buildLedger(invoices: StatementInvoiceRow[]): {
  entries: LedgerEntry[];
  currency: string;
} {
  const currency = invoices[0]?.currency ?? "KES";
  const raw: Omit<LedgerEntry, "balance">[] = [];

  for (const inv of invoices) {
    const issueDate = inv.issue_date ?? "";
    raw.push({
      date: issueDate,
      description: "Invoice issued",
      invoiceNumber: inv.invoice_number,
      debit: inv.total ?? 0,
      credit: 0,
      currency,
    });
    if (inv.status === "paid" && inv.paid_at) {
      raw.push({
        date: inv.paid_at.slice(0, 10),
        description: "Payment received",
        invoiceNumber: inv.invoice_number,
        debit: 0,
        credit: inv.total ?? 0,
        currency,
      });
    }
  }

  raw.sort((a, b) => a.date.localeCompare(b.date));

  let running = 0;
  const entries: LedgerEntry[] = raw.map((r) => {
    running = running + r.debit - r.credit;
    return { ...r, balance: running };
  });

  return { entries, currency };
}

function fmt(n: number, currency: string) {
  return `${currency} ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

export function PublicStatementPage() {
  const { token } = useParams<{ token: string }>();
  const { theme } = useTheme();
  const logo = theme === "dark" ? LogoLime : LogoGreen;
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  const {
    data: statement,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["statement-public", token],
    queryFn: () => getStatementByToken(token!),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-muted/30'>
        <Spokes className='h-7 w-7 text-primary' />
      </div>
    );
  }

  if (isError || !statement) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-muted/30'>
        <div className='text-center'>
          <p className='text-sm font-medium'>Statement not found</p>
          <p className='mt-1 text-xs text-muted-foreground'>
            This link may be invalid or expired.
          </p>
        </div>
      </div>
    );
  }

  type FromDetails = {
    name?: string;
    logo_url?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    zip?: string;
    country_code?: string;
    phone?: string;
    email?: string;
    tax_id?: string;
  };
  type CustomerDetails = {
    name?: string;
    email?: string;
    billing_email?: string;
    phone?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    zip?: string;
    country?: string;
  };

  const from = (statement.from_details ?? {}) as FromDetails;
  const customer = (statement.customer_details ?? {}) as CustomerDetails;
  const customerName = customer.name ?? "Customer";
  const customerEmail = customer.billing_email ?? customer.email ?? null;

  const { entries, currency } = buildLedger(statement.snapshot_data);
  const totalDebits = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredits = entries.reduce((s, e) => s + e.credit, 0);
  const closingBalance = totalDebits - totalCredits;

  function safeFormatDate(value: string | null | undefined): string {
    if (!value) return "—"
    const d = parseISO(value)
    return isValid(d) ? format(d, "dd/MM/yyyy") : "—"
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Failed to copy link")
    }
  }

  async function handleDownload() {
    setIsPdfDownloading(true);
    try {
      const fromSnap = (statement.from_details ?? {}) as Record<string, string | null>;
      const customerSnap = (statement.customer_details ?? {}) as Record<string, string | null>;
      await downloadPdf(
        <StatementPdf
          data={{
            currency,
            from: {
              name: fromSnap.name,
              logo_url: fromSnap.logo_url,
              address_line1: fromSnap.address_line1,
              address_line2: fromSnap.address_line2,
              city: fromSnap.city,
              zip: fromSnap.zip,
              country_code: fromSnap.country_code,
              phone: fromSnap.phone,
              email: fromSnap.email,
              tax_id: fromSnap.tax_id,
            },
            customer: {
              name: customerSnap.name,
              email: customerSnap.email,
              billing_email: customerSnap.billing_email,
              phone: customerSnap.phone,
              address_line1: customerSnap.address_line1,
              address_line2: customerSnap.address_line2,
              city: customerSnap.city,
              zip: customerSnap.zip,
              country: customerSnap.country,
            },
            statementDate: safeFormatDate(statement.created_at),
            dateFrom: safeFormatDate(statement.date_from),
            dateTo: safeFormatDate(statement.date_to),
            entries,
            notes: statement.notes,
          }}
        />,
        `Statement-${customerSnap.name ?? "Customer"}.pdf`,
      );
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setIsPdfDownloading(false);
    }
  }

  return (
    <div className='min-h-screen bg-muted/30'>
      {/* Top bar */}
      <div className='flex items-center justify-between border-b bg-background px-6 py-3'>
        <div className='flex items-center gap-2'>
          <img src={logo} alt='Travada Books' className='size-6' />
          <span className='text-sm font-semibold'>Travada Books</span>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' className='gap-1.5' onClick={copyLink}>
            <Copy01Icon size={13} />
            Copy Link
          </Button>
          <Button variant='outline' className='gap-1.5' onClick={handleDownload} disabled={isPdfDownloading}>
            <Download01Icon size={13} />
            {isPdfDownloading ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Statement */}
      <div className='flex justify-center px-4 py-10'>
        <div className='w-full max-w-4xl rounded-lg border bg-white p-10 text-sm shadow-sm dark:bg-card'>
          {/* Letterhead */}
          <div className='flex items-start justify-between'>
            <div>
              {from.logo_url ?
                <img
                  src={from.logo_url}
                  alt={from.name}
                  className='h-9 w-auto max-w-[140px] object-contain'
                />
              : <div className='flex size-9 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold'>
                  {from.name?.slice(0, 2).toUpperCase() ?? "TB"}
                </div>
              }
              <div className='mt-2 space-y-0.5'>
                <p className='font-semibold text-foreground'>
                  {from.name ?? "Your Business"}
                </p>
                {from.address_line1 && (
                  <p className='text-xs text-muted-foreground'>
                    {from.address_line1}
                  </p>
                )}
                {from.address_line2 && (
                  <p className='text-xs text-muted-foreground'>
                    {from.address_line2}
                  </p>
                )}
                {(from.city || from.zip) && (
                  <p className='text-xs text-muted-foreground'>
                    {[from.city, from.zip].filter(Boolean).join(" ")}
                  </p>
                )}
                {from.country_code && (
                  <p className='text-xs text-muted-foreground'>
                    {from.country_code}
                  </p>
                )}
                {from.phone && (
                  <p className='text-xs text-muted-foreground'>{from.phone}</p>
                )}
                {from.email && (
                  <p className='text-xs text-muted-foreground'>{from.email}</p>
                )}
                {from.tax_id && (
                  <p className='text-xs text-muted-foreground'>
                    PIN: {from.tax_id}
                  </p>
                )}
              </div>
            </div>
            <div className='text-right'>
              <p className='text-2xl font-bold text-foreground'>STATEMENT</p>
              <p className='text-xs text-muted-foreground'>
                {safeFormatDate(statement.created_at)}
              </p>
            </div>
          </div>

          <Separator className='my-6' />

          {/* Prepared for + period */}
          <div className='grid grid-cols-2 gap-6'>
            <div>
              <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                Prepared for
              </p>
              <div className='mt-1.5 space-y-0.5'>
                <p className='font-medium text-foreground'>{customerName}</p>
                {customer.address_line1 && (
                  <p className='text-xs text-muted-foreground'>
                    {customer.address_line1}
                  </p>
                )}
                {customer.address_line2 && (
                  <p className='text-xs text-muted-foreground'>
                    {customer.address_line2}
                  </p>
                )}
                {(customer.city || customer.zip) && (
                  <p className='text-xs text-muted-foreground'>
                    {[customer.city, customer.zip].filter(Boolean).join(" ")}
                  </p>
                )}
                {customer.country && (
                  <p className='text-xs text-muted-foreground'>
                    {customer.country}
                  </p>
                )}
                {customer.phone && (
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
                <span className='text-muted-foreground'>Statement date:</span>
                <span className='font-medium'>
                  {safeFormatDate(statement.created_at)}
                </span>
              </div>
              <div className='flex justify-between text-xs'>
                <span className='text-muted-foreground'>Period from:</span>
                <span className='font-medium'>
                  {safeFormatDate(statement.date_from)}
                </span>
              </div>
              <div className='flex justify-between text-xs'>
                <span className='text-muted-foreground'>Period to:</span>
                <span className='font-medium'>
                  {safeFormatDate(statement.date_to)}
                </span>
              </div>
              <div className='flex justify-between text-xs'>
                <span className='text-muted-foreground'>Currency:</span>
                <span className='font-medium'>{currency}</span>
              </div>
            </div>
          </div>

          <Separator className='my-6' />

          {/* Ledger */}
          {entries.length === 0 ?
            <p className='py-6 text-center text-xs text-muted-foreground'>
              No invoices in this period.
            </p>
          : <table className='w-full text-xs'>
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
                <tr className='border-b border-dashed bg-muted/30'>
                  <td className='py-2.5 text-muted-foreground'>—</td>
                  <td className='py-2.5 font-medium' colSpan={2}>
                    Opening balance
                  </td>
                  <td className='py-2.5 text-right text-muted-foreground'>—</td>
                  <td className='py-2.5 text-right text-muted-foreground'>—</td>
                  <td className='py-2.5 text-right font-medium'>
                    {fmt(0, currency)}
                  </td>
                </tr>
                {entries.map((entry, i) => (
                  <tr key={i} className='border-b border-dashed'>
                    <td className='py-2.5 text-muted-foreground'>
                      {safeFormatDate(entry.date)}
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
                        entry.balance > 0 && "text-destructive",
                      )}
                    >
                      {fmt(entry.balance, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }

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
              <span className={cn(closingBalance > 0 && "text-destructive")}>
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
            <a
              href='https://travadasys.com'
              className='underline underline-offset-2'
              target='_blank'
              rel='noreferrer'
            >
              Travada Books
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
