import { useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Copy01Icon, Download01Icon, Wallet01Icon } from "@travada-books/ui/icons"
import { Button } from "@travada-books/ui/components/button"
import { Separator } from "@travada-books/ui/components/separator"
import { useTheme } from "@/components/theme-provider"
import { getInvoiceByToken } from "@/lib/queries/invoices"
import LogoGreen from "@/assets/Logo-Green.svg"
import LogoLime from "@/assets/Logo-Lime.svg"
import { toast } from "sonner"
import { format } from "date-fns"

export function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>()
  const { theme } = useTheme()
  const logo = theme === "dark" ? LogoLime : LogoGreen

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ["invoice-public", token],
    queryFn: () => getInvoiceByToken(token!),
    enabled: !!token,
  })

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

  const lineItems = invoice.line_items ?? []
  const subtotal = invoice.subtotal ?? 0
  const taxAmount = invoice.tax_amount ?? 0
  const total = invoice.total ?? 0

  const fmt = (n: number) =>
    n.toLocaleString("en-KE", { minimumFractionDigits: 2 })

  function formatDate(d: string | null) {
    if (!d) return "—"
    return format(new Date(d), "dd/MM/yyyy")
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    toast.success("Link copied to clipboard")
  }

  type FromDetails = {
    name?: string; logo_url?: string; address_line1?: string; address_line2?: string;
    city?: string; zip?: string; country_code?: string; phone?: string; email?: string; tax_id?: string;
  }
  type CustomerDetails = {
    name?: string; email?: string; billing_email?: string; phone?: string;
    address_line1?: string; address_line2?: string; city?: string; zip?: string; country?: string;
  }

  const from = (invoice.from_details ?? {}) as FromDetails
  const customerDetails = (invoice.customer_details ?? {}) as CustomerDetails
  const customerName = customerDetails.name ?? invoice.customer_name
  const customerEmail = customerDetails.billing_email ?? customerDetails.email ?? null

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
          <Button variant="outline" className="gap-1.5">
            <Download01Icon size={13} />
            Download PDF
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
        <div className="w-full max-w-2xl rounded-lg border bg-white p-10 text-sm shadow-sm dark:bg-card">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              {from.logo_url ? (
                <img
                  src={from.logo_url}
                  alt={from.name}
                  className="h-9 w-auto max-w-[140px] object-contain"
                />
              ) : (
                <div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold">
                  {from.name?.slice(0, 2).toUpperCase() ?? "TB"}
                </div>
              )}
              <div className="mt-2 space-y-0.5">
                <p className="font-semibold text-foreground">{from.name ?? "Your Business"}</p>
                {from.address_line1 && <p className="text-xs text-muted-foreground">{from.address_line1}</p>}
                {from.address_line2 && <p className="text-xs text-muted-foreground">{from.address_line2}</p>}
                {(from.city || from.zip) && (
                  <p className="text-xs text-muted-foreground">{[from.city, from.zip].filter(Boolean).join(" ")}</p>
                )}
                {from.country_code && <p className="text-xs text-muted-foreground">{from.country_code}</p>}
                {from.phone && <p className="text-xs text-muted-foreground">{from.phone}</p>}
                {from.email && <p className="text-xs text-muted-foreground">{from.email}</p>}
                {from.tax_id && <p className="text-xs text-muted-foreground">PIN: {from.tax_id}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">INVOICE</p>
              <p className="text-xs text-muted-foreground">{invoice.invoice_number ?? "—"}</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bill To</p>
              <div className="mt-1.5 space-y-0.5">
                <p className="font-medium text-foreground">{customerName}</p>
                {customerDetails.address_line1 && <p className="text-xs text-muted-foreground">{customerDetails.address_line1}</p>}
                {customerDetails.address_line2 && <p className="text-xs text-muted-foreground">{customerDetails.address_line2}</p>}
                {(customerDetails.city || customerDetails.zip) && (
                  <p className="text-xs text-muted-foreground">{[customerDetails.city, customerDetails.zip].filter(Boolean).join(" ")}</p>
                )}
                {customerDetails.country && <p className="text-xs text-muted-foreground">{customerDetails.country}</p>}
                {customerDetails.phone && <p className="text-xs text-muted-foreground">{customerDetails.phone}</p>}
                {customerEmail && <p className="text-xs text-muted-foreground">{customerEmail}</p>}
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Invoice #:</span>
                <span className="font-medium">{invoice.invoice_number ?? "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Issue date:</span>
                <span className="font-medium">{formatDate(invoice.issue_date)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Due date:</span>
                <span className="font-medium">{formatDate(invoice.due_date)}</span>
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
              {lineItems.map((item, i) => (
                <tr key={i} className="border-b border-dashed">
                  <td className="py-3">{item.description}</td>
                  <td className="py-3 text-right">{item.quantity}</td>
                  <td className="py-3 text-right">
                    {invoice.currency} {fmt(item.price)}
                  </td>
                  <td className="py-3 text-right">{item.tax_rate}%</td>
                  <td className="py-3 text-right font-medium">
                    {invoice.currency}{" "}
                    {fmt(item.quantity * item.price * (1 + item.tax_rate / 100))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 flex flex-col items-end gap-1.5 text-xs">
            <div className="flex w-48 justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{invoice.currency} {fmt(subtotal)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex w-48 justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{invoice.currency} {fmt(taxAmount)}</span>
              </div>
            )}
            {(invoice.discount ?? 0) > 0 && (
              <div className="flex w-48 justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>- {invoice.currency} {fmt(invoice.discount ?? 0)}</span>
              </div>
            )}
            <Separator className="my-1 w-48" />
            <div className="flex w-48 justify-between text-sm font-semibold">
              <span>Total</span>
              <span>{invoice.currency} {fmt(total)}</span>
            </div>
          </div>

          {invoice.note && (
            <>
              <Separator className="my-6" />
              <div>
                <p className="text-xs font-medium">Notes</p>
                <p className="mt-1 text-xs text-muted-foreground">{invoice.note}</p>
              </div>
            </>
          )}

          {invoice.payment_details && (
            <>
              <Separator className="my-6" />
              <div>
                <p className="text-xs font-medium">Payment Details</p>
                <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{invoice.payment_details}</p>
              </div>
            </>
          )}

          <Separator className="my-6" />
          <p className="text-center text-[10px] text-muted-foreground">
            Powered by{" "}
            <a
              href="https://travadasys.com"
              className="underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              Travada Books
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
