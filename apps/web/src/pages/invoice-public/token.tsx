import { useState, useEffect } from "react"
import { useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Copy01Icon, Download01Icon, Wallet01Icon } from "@travada-books/ui/icons"
import { Button } from "@travada-books/ui/components/button"
import { Spokes } from "@travada-books/ui/components/spokes"
import { useTheme } from "@/components/theme-provider"
import { useFormatDate } from "@/hooks/use-format-date"
import { getInvoiceByToken, invoiceBalance } from "@/lib/queries/invoices"
import { getInvoicePaymentsByToken } from "@/lib/queries/payments"
import { InvoicePreview, InvoicePdf } from "@/components/invoice-templates"
import { downloadPdf } from "@/lib/pdf-download"
import { formatCurrency } from "@/lib/format"
import LogoGreen from "@/assets/Logo-Green.svg"
import LogoLime from "@/assets/Logo-Lime.svg"
import { toast } from "sonner"
import { trackEvent, LogEvents } from "@/lib/analytics"

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mpesa: "M-Pesa",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
}

export function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>()
  const { theme } = useTheme()
  const { formatDate } = useFormatDate()
  const logo = theme === "dark" ? LogoLime : LogoGreen
  const [isDownloading, setIsDownloading] = useState(false)

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ["invoice-public", token],
    queryFn: () => getInvoiceByToken(token!),
    enabled: !!token,
  })

  const { data: payments } = useQuery({
    queryKey: ["invoice-payments-public", token],
    queryFn: () => getInvoicePaymentsByToken(token!),
    enabled: !!token && !!invoice && invoice.amount_paid > 0,
  })

  useEffect(() => {
    if (!invoice) return;
    trackEvent(LogEvents.InvoiceViewed, {
      invoice_number: invoice.invoice_number,
      currency: invoice.currency,
      invoice_amount: invoice.total,
    });
  }, [invoice?.id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Spokes className="h-7 w-7 text-primary" />
      </div>
    )
  }

  if (isError || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <p className="text-sm font-medium">Invoice not found</p>
          <p className="mt-1 text-xs text-muted-foreground">This link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  type Snapshot = Record<string, string | null>
  const from = (invoice.from_details ?? {}) as Snapshot
  const customerSnap = (invoice.customer_details ?? {}) as Snapshot

  const documentData = {
    label: "INVOICE",
    number: invoice.invoice_number,
    currency: invoice.currency,
    issueDate: invoice.issue_date,
    secondaryDate: invoice.due_date,
    secondaryDateLabel: "Due date:",
    from: {
      name: from.name,
      logo_url: from.logo_url,
      address_line1: from.address_line1,
      address_line2: from.address_line2,
      city: from.city,
      zip: from.zip,
      country_code: from.country_code,
      phone: from.phone,
      email: from.email,
      tax_id: from.tax_id,
    },
    customer: {
      name: customerSnap.name ?? invoice.customer_name,
      email: customerSnap.email,
      billing_email: customerSnap.billing_email,
      phone: customerSnap.phone,
      address_line1: customerSnap.address_line1,
      address_line2: customerSnap.address_line2,
      city: customerSnap.city,
      zip: customerSnap.zip,
      country: customerSnap.country,
    },
    customerLabel: "Bill To",
    lineItems: invoice.line_items ?? [],
    subtotal: invoice.subtotal,
    taxAmount: invoice.tax_amount,
    discount: invoice.discount,
    total: invoice.total,
    note: invoice.note,
    paymentDetails: invoice.payment_details,
    publicUrl: window.location.href,
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
    setIsDownloading(true)
    try {
      await downloadPdf(
        <InvoicePdf data={documentData} invoiceTemplate={invoice.invoice_template} />,
        invoice.invoice_number ?? "Invoice",
      )
    } catch {
      toast.error("Failed to generate PDF")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 border-b bg-background px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Travada Books" className="size-6" />
          <span className="text-sm font-semibold">Travada Books</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5" onClick={copyLink}>
            <Copy01Icon size={13} />
            <span className="hidden sm:inline">Copy Link</span>
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={handleDownload} disabled={isDownloading}>
            <Download01Icon size={13} />
            <span className="hidden sm:inline">{isDownloading ? "Generating…" : "Download PDF"}</span>
          </Button>
          {invoice.accept_payments && (
            <Button className="gap-1.5">
              <Wallet01Icon size={13} />
              <span className="hidden sm:inline">Pay Invoice</span>
            </Button>
          )}
        </div>
      </div>

      {/* Invoice */}
      <div className="flex justify-center px-3 py-6 sm:px-4 sm:py-10">
        <div className="w-full max-w-2xl">
          <InvoicePreview data={documentData} invoiceTemplate={invoice.invoice_template} />

          {invoice.amount_paid > 0 && (
            <div className="mt-4 rounded-lg border bg-background px-5 py-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {invoice.status === "paid" ?
                    "Paid in full"
                  : <>
                      {formatCurrency(invoice.amount_paid, invoice.currency)} of{" "}
                      {formatCurrency(invoice.total ?? 0, invoice.currency)} paid
                    </>
                  }
                </span>
                {invoice.status !== "paid" && (
                  <span className="font-medium">
                    {formatCurrency(invoiceBalance(invoice), invoice.currency)} due
                  </span>
                )}
              </div>

              {payments && payments.length > 0 && (
                <div className="mt-3 flex flex-col divide-y border-t pt-3">
                  <p className="pb-2 text-[11px] font-medium text-muted-foreground">
                    Payments received
                  </p>
                  {payments.map((payment, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 first:pt-0"
                    >
                      <span>{formatCurrency(payment.amount, invoice.currency)}</span>
                      <span className="text-muted-foreground">
                        {formatDate(payment.paid_at)} ·{" "}
                        {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
