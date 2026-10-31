import { Separator } from "@travada-books/ui/components/separator"
import {
  formatMoney as fmt,
  resolveDateFnsPattern,
  formatServerDate,
  type ClassicDocumentData,
} from "@travada-books/pdf"
import { normalizeCustomFields } from "@/lib/custom-fields"
import { CustomFieldsPreview } from "@/components/invoices/custom-fields"

export type { ClassicDocumentData, Participant } from "@travada-books/pdf"

export function ClassicPreview({ data }: { data: ClassicDocumentData }) {
  const {
    label = "INVOICE",
    number,
    currency,
    issueDate,
    secondaryDate,
    secondaryDateLabel = "Due date:",
    from,
    customer,
    customerLabel = "Bill To",
    lineItems,
    subtotal,
    taxAmount,
    discount,
    total,
    note,
    paymentDetails,
    customFields,
    dateFormat,
    showTaxColumn,
    showQtyColumn,
    status,
  } = data

  const datePattern = resolveDateFnsPattern(dateFormat)
  const formatDate = (d: string | null | undefined) => formatServerDate(d, datePattern)
  // NULL (quotes, and invoices saved before this setting existed) must
  // render exactly as this preview always has: Qty and Tax both shown —
  // see ClassicDocumentData.showTaxColumn/showQtyColumn.
  const showQty = showQtyColumn ?? true
  const showTax = showTaxColumn ?? true

  const displaySubtotal = subtotal ?? lineItems.reduce((s, i) => s + i.quantity * i.price, 0)
  const displayTax = taxAmount ?? lineItems.reduce((s, i) => s + i.quantity * i.price * (i.tax_rate / 100), 0)
  const displayDiscount = discount ?? 0
  const displayTotal = total ?? displaySubtotal + displayTax - displayDiscount

  const customerEmail = customer.billing_email ?? customer.email

  return (
    <div className="rounded-lg border bg-white p-5 text-sm [overflow-wrap:anywhere] shadow-sm sm:p-10 dark:bg-card">
      {/* Letterhead */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {from.logo_url ? (
            <img
              src={from.logo_url}
              alt={from.name ?? ""}
              className="h-9 w-auto max-w-[140px] object-contain"
            />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold">
              {(from.name ?? "TB").slice(0, 2).toUpperCase()}
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
        <div className="min-w-0 text-right sm:max-w-1/2">
          <p className="text-2xl font-bold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{number ?? "—"}</p>
          {status === "canceled" && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-destructive">
              Canceled
            </p>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{customerLabel}</p>
          <div className="mt-1.5 space-y-0.5">
            <p className="font-medium text-foreground">{customer.name ?? "—"}</p>
            {customer.address_line1 && <p className="text-xs text-muted-foreground">{customer.address_line1}</p>}
            {customer.address_line2 && <p className="text-xs text-muted-foreground">{customer.address_line2}</p>}
            {(customer.city || customer.zip) && (
              <p className="text-xs text-muted-foreground">{[customer.city, customer.zip].filter(Boolean).join(" ")}</p>
            )}
            {customer.country && <p className="text-xs text-muted-foreground">{customer.country}</p>}
            {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
            {customerEmail && <p className="text-xs text-muted-foreground">{customerEmail}</p>}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-muted-foreground">Issue date:</span>
            <span className="font-medium">{formatDate(issueDate)}</span>
          </div>
          {secondaryDate !== undefined && (
            <div className="flex justify-between gap-4 text-xs">
              <span className="text-muted-foreground">{secondaryDateLabel}</span>
              <span className="font-medium">{formatDate(secondaryDate)}</span>
            </div>
          )}
        </div>
      </div>

      {normalizeCustomFields(customFields ?? []).length > 0 && (
        <>
          <Separator className="my-6" />
          <CustomFieldsPreview fields={customFields ?? []} />
        </>
      )}

      <Separator className="my-6" />

      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[480px] text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="min-w-40 pb-3 text-left font-medium">Description</th>
              {showQty && <th className="whitespace-nowrap pb-3 pl-4 text-right font-medium">Qty</th>}
              {showQty && <th className="whitespace-nowrap pb-3 pl-4 text-right font-medium">Rate</th>}
              {showTax && <th className="whitespace-nowrap pb-3 pl-4 text-right font-medium">Tax</th>}
              <th className="whitespace-nowrap pb-3 pl-4 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => (
              <tr key={i} className="border-b border-dashed">
                <td className="py-3">{item.description}</td>
                {showQty && <td className="whitespace-nowrap py-3 pl-4 text-right">{item.quantity}</td>}
                {showQty && <td className="whitespace-nowrap py-3 pl-4 text-right">{currency} {fmt(item.price)}</td>}
                {showTax && <td className="whitespace-nowrap py-3 pl-4 text-right">{item.tax_rate}%</td>}
                <td className="whitespace-nowrap py-3 pl-4 text-right font-medium">
                  {currency} {fmt(item.quantity * item.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 ml-auto flex w-fit max-w-full min-w-48 flex-col gap-1.5 text-xs">
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{currency} {fmt(displaySubtotal)}</span>
        </div>
        {displayTax > 0 && (
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Tax</span>
            <span>{currency} {fmt(displayTax)}</span>
          </div>
        )}
        {displayDiscount > 0 && (
          <div className="flex justify-between gap-6 text-green-600 dark:text-green-400">
            <span>Discount</span>
            <span>− {currency} {fmt(displayDiscount)}</span>
          </div>
        )}
        <Separator className="my-1" />
        <div className="flex justify-between gap-6 text-sm font-semibold">
          <span>Total</span>
          <span>{currency} {fmt(displayTotal)}</span>
        </div>
      </div>

      {paymentDetails && (
        <>
          <Separator className="my-6" />
          <div>
            <p className="text-xs font-medium">Payment Details</p>
            <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{paymentDetails}</p>
          </div>
        </>
      )}

      {note && (
        <>
          <Separator className="my-6" />
          <div>
            <p className="text-xs font-medium">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{note}</p>
          </div>
        </>
      )}

      <Separator className="my-6" />
      <p className="text-center text-[10px] text-muted-foreground">
        Powered by{" "}
        <span className="underline underline-offset-2">Travada Books</span>
      </p>
    </div>
  )
}
