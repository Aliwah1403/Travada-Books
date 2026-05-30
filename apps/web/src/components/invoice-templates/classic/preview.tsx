import { format } from "date-fns"
import { Separator } from "@travada-books/ui/components/separator"
import type { LineItem } from "@/lib/queries/invoices"

export type Participant = {
  name?: string | null
  logo_url?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  zip?: string | null
  country?: string | null
  country_code?: string | null
  phone?: string | null
  email?: string | null
  billing_email?: string | null
  tax_id?: string | null
}

export type ClassicDocumentData = {
  label?: string
  number: string | null
  currency: string
  issueDate: string | null
  secondaryDate?: string | null
  secondaryDateLabel?: string
  from: Participant
  customer: Participant
  customerLabel?: string
  lineItems: LineItem[]
  subtotal: number | null
  taxAmount: number | null
  discount: number | null
  total: number | null
  note: string | null
  paymentDetails?: string | null
  publicUrl?: string | null
}

function fmt(n: number) {
  return n.toLocaleString("en-KE", { minimumFractionDigits: 2 })
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—"
  const parsed = new Date(d)
  if (!Number.isFinite(parsed.getTime())) return "—"
  return format(parsed, "dd/MM/yyyy")
}

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
  } = data

  const displaySubtotal = subtotal ?? lineItems.reduce((s, i) => s + i.quantity * i.price, 0)
  const displayTax = taxAmount ?? lineItems.reduce((s, i) => s + i.quantity * i.price * (i.tax_rate / 100), 0)
  const displayDiscount = discount ?? 0
  const displayTotal = total ?? displaySubtotal + displayTax - displayDiscount

  const customerEmail = customer.billing_email ?? customer.email

  return (
    <div className="rounded-lg border bg-white p-10 text-sm shadow-sm dark:bg-card">
      {/* Letterhead */}
      <div className="flex items-start justify-between">
        <div>
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
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{number ?? "—"}</p>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="grid grid-cols-2 gap-6">
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
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Issue date:</span>
            <span className="font-medium">{formatDate(issueDate)}</span>
          </div>
          {secondaryDate !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{secondaryDateLabel}</span>
              <span className="font-medium">{formatDate(secondaryDate)}</span>
            </div>
          )}
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
              <td className="py-3 text-right">{currency} {fmt(item.price)}</td>
              <td className="py-3 text-right">{item.tax_rate}%</td>
              <td className="py-3 text-right font-medium">
                {currency} {fmt(item.quantity * item.price * (1 + item.tax_rate / 100))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 flex flex-col items-end gap-1.5 text-xs">
        <div className="flex w-48 justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{currency} {fmt(displaySubtotal)}</span>
        </div>
        {displayTax > 0 && (
          <div className="flex w-48 justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{currency} {fmt(displayTax)}</span>
          </div>
        )}
        {displayDiscount > 0 && (
          <div className="flex w-48 justify-between text-green-600 dark:text-green-400">
            <span>Discount</span>
            <span>− {currency} {fmt(displayDiscount)}</span>
          </div>
        )}
        <Separator className="my-1 w-48" />
        <div className="flex w-48 justify-between text-sm font-semibold">
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
            <p className="mt-1 text-xs text-muted-foreground">{note}</p>
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
