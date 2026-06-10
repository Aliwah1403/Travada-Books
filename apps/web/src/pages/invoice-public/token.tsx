import { useState, useEffect } from "react"
import { useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Copy01Icon, Download01Icon, Wallet01Icon } from "@travada-books/ui/icons"
import { Button } from "@travada-books/ui/components/button"
import { useTheme } from "@/components/theme-provider"
import { getInvoiceByToken } from "@/lib/queries/invoices"
import { InvoicePreview, InvoicePdf } from "@/components/invoice-templates"
import { downloadPdf } from "@/lib/pdf-download"
import LogoGreen from "@/assets/Logo-Green.svg"
import LogoLime from "@/assets/Logo-Lime.svg"
import { toast } from "sonner"
import { trackEvent, LogEvents } from "@/lib/analytics"

export function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>()
  const { theme } = useTheme()
  const logo = theme === "dark" ? LogoLime : LogoGreen
  const [isDownloading, setIsDownloading] = useState(false)

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ["invoice-public", token],
    queryFn: () => getInvoiceByToken(token!),
    enabled: !!token,
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
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
      <div className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Travada Books" className="size-6" />
          <span className="text-sm font-semibold">Travada Books</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5" onClick={copyLink}>
            <Copy01Icon size={13} />
            Copy Link
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={handleDownload} disabled={isDownloading}>
            <Download01Icon size={13} />
            {isDownloading ? "Generating…" : "Download PDF"}
          </Button>
          {invoice.accept_payments && (
            <Button className="gap-1.5">
              <Wallet01Icon size={13} />
              Pay Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Invoice */}
      <div className="flex justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <InvoicePreview data={documentData} invoiceTemplate={invoice.invoice_template} />
        </div>
      </div>
    </div>
  )
}
