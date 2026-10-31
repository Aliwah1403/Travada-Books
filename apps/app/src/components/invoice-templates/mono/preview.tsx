import type { ClassicDocumentData } from "@travada-books/pdf"
import { addressLines, contactLines, fmt, getDocumentView, PoweredBy } from "../shared"

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm uppercase tracking-wide text-foreground">{children}</p>
}

export function MonoPreview({ data }: { data: ClassicDocumentData }) {
  const { from, customer, currency, number, lineItems, note, paymentDetails, status } = data
  const view = getDocumentView(data)
  const noun = view.isQuote ? "Quote" : "Invoice"
  const footer = [from.name, from.email].filter(Boolean).join("  •  ")

  return (
    <div className="@container rounded-lg border bg-white p-5 font-mono text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere] shadow-sm sm:p-12 dark:bg-card">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
        {from.logo_url ? (
          <img
            src={from.logo_url}
            alt={from.name ?? ""}
            className="h-12 w-auto max-w-[140px] object-contain"
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center bg-foreground text-sm font-bold text-background">
            {(from.name ?? "TB").slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="w-full min-w-0 sm:w-auto sm:text-right">
          <p className="mb-3 uppercase tracking-[0.2em] text-foreground">
            {from.name ?? "Your Business"}
          </p>
          {addressLines(from).map((line) => (
            <p key={line}>{line}</p>
          ))}
          {contactLines(from).map((line) => (
            <p key={line} className="break-words">
              {line}
            </p>
          ))}
          {from.tax_id && <p>PIN: {from.tax_id}</p>}
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Label>{view.customerLabel}</Label>
          <div className="mt-3">
            <p>{customer.name ?? "—"}</p>
            {addressLines(customer).map((line) => (
              <p key={line}>{line}</p>
            ))}
            {contactLines(customer).length > 0 && <div className="h-3" />}
            {contactLines(customer).map((line) => (
              <p key={line} className="break-words">
                {line}
              </p>
            ))}
          </div>
        </div>
        <div className="min-w-0 sm:max-w-1/2 sm:text-right">
          <p className="text-xl font-bold tracking-wide text-foreground">{view.label}</p>
          {status === "canceled" && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-destructive">
              Canceled
            </p>
          )}
          <div className="mt-3">
            <Label>{noun} Number</Label>
            <p>{number ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 @[520px]:grid-cols-[7.5rem_minmax(0,1fr)] @[520px]:gap-5">
        {/* Dates and custom fields run down a rail beside the items, or sit above
            them when the document is drawn too narrow for both. */}
        <div className="grid grid-cols-2 gap-5 @[520px]:block @[520px]:space-y-5">
          <div>
            <Label>{noun} Date</Label>
            <p className="mt-3">{view.formatDate(data.issueDate)}</p>
          </div>
          {data.secondaryDate !== undefined && (
            <div>
              <Label>{view.secondaryDateLabel}</Label>
              <p className="mt-3">{view.formatDate(data.secondaryDate)}</p>
            </div>
          )}
          {view.customFields.map((field) => (
            <div key={field.id}>
              <Label>{field.label}</Label>
              <p className="mt-3 break-words">{field.value}</p>
            </div>
          ))}
        </div>

        <div className="min-w-0">
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[380px]">
              <thead>
                <tr className="uppercase tracking-wide text-foreground">
                  <th className="min-w-28 pb-3 text-left font-normal">Description</th>
                  {view.showQty && <th className="whitespace-nowrap pb-3 pl-3 text-right font-normal">Rate</th>}
                  {view.showQty && <th className="whitespace-nowrap pb-3 pl-3 text-right font-normal">Qty</th>}
                  {view.showTax && <th className="whitespace-nowrap pb-3 pl-3 text-right font-normal">Tax</th>}
                  <th className="whitespace-nowrap pb-3 pl-3 text-right font-normal">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2.5 align-top">{item.description}</td>
                    {view.showQty && <td className="whitespace-nowrap py-2.5 pl-3 text-right align-top">{fmt(item.price)}</td>}
                    {view.showQty && <td className="whitespace-nowrap py-2.5 pl-3 text-right align-top">{item.quantity}</td>}
                    {view.showTax && <td className="whitespace-nowrap py-2.5 pl-3 text-right align-top">{item.tax_rate}%</td>}
                    <td className="whitespace-nowrap py-2.5 pl-3 text-right align-top">{fmt(item.quantity * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 border-t pt-6">
            <div className="ml-auto flex w-full max-w-full flex-col gap-2 sm:w-fit sm:min-w-72">
            <div className="flex justify-between gap-6">
              <span className="text-foreground">Subtotal</span>
              <span>{fmt(view.subtotal)}</span>
            </div>
            {view.tax > 0 && (
              <div className="flex justify-between gap-6">
                <span className="text-foreground">Tax</span>
                <span>{fmt(view.tax)}</span>
              </div>
            )}
            {view.discount > 0 && (
              <div className="flex justify-between gap-6">
                <span className="text-foreground">Discount</span>
                <span>− {fmt(view.discount)}</span>
              </div>
            )}
            <div className="mt-2 flex items-baseline justify-between gap-6 text-sm uppercase tracking-wide text-foreground">
              <span>Total</span>
              <span className="text-base normal-case tracking-normal">
                {currency} {fmt(view.total)}
              </span>
            </div>
            </div>
          </div>
        </div>
      </div>

      {paymentDetails && (
        <div className="mt-12">
          <Label>Payment Details</Label>
          <p className="mt-3 whitespace-pre-wrap break-words">{paymentDetails}</p>
        </div>
      )}

      {note && (
        <div className="mt-10">
          <Label>Notes</Label>
          <p className="mt-3 whitespace-pre-wrap break-words">{note}</p>
        </div>
      )}

      <div className="mt-12 flex flex-col items-center gap-2 border-t pt-5 text-center">
        {footer && <p className="break-words">{footer}</p>}
        <PoweredBy />
      </div>
    </div>
  )
}
