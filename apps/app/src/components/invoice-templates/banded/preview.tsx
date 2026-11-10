import { CustomFieldsPreview } from "@/components/invoices/custom-fields"
import type { ClassicDocumentData, Participant } from "@travada-books/pdf"
import { addressLines, contactLines, fmt, getDocumentView, PoweredBy, taxIdLine } from "../shared"

function Party({ title, party }: { title: string; party: Participant }) {
  const contact = contactLines(party)
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1">{party.name ?? "—"}</p>
      <div className="mt-3 space-y-0.5">
        {addressLines(party).length > 0 && <p>{addressLines(party).join(", ")}</p>}
        {contact.length > 0 && <p className="break-words">{contact.join(" | ")}</p>}
        {taxIdLine(party) && <p>{taxIdLine(party)}</p>}
      </div>
    </div>
  )
}

export function BandedPreview({ data }: { data: ClassicDocumentData }) {
  const { from, customer, currency, number, lineItems, note, paymentDetails, status } = data
  const view = getDocumentView(data)
  const footerItems = [
    addressLines(from).join(", "),
    from.phone,
    from.email,
  ].filter(Boolean)

  return (
    <div className="overflow-hidden rounded-lg border bg-white font-heading text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere] shadow-sm dark:bg-card">
      <div className="px-5 pt-8 sm:px-10">
        <div className="flex justify-center pb-6">
          {from.logo_url ? (
            <img
              src={from.logo_url}
              alt={from.name ?? ""}
              className="h-10 w-auto max-w-[200px] object-contain"
            />
          ) : (
            <p className="text-xl font-semibold tracking-tight text-foreground">
              {from.name ?? "Your Business"}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between gap-4 border-y py-4">
          <div className="min-w-0">
            <p className="text-2xl font-bold tracking-wide text-foreground">{view.label}</p>
            <p className="mt-0.5">{number ?? "—"}</p>
            {status === "canceled" && (
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-destructive">
                Canceled
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-medium text-foreground">{view.formatDate(data.issueDate)}</p>
            {data.secondaryDate !== undefined && (
              <p className="mt-0.5 capitalize">
                {view.secondaryDateLabel}: {view.formatDate(data.secondaryDate)}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2 sm:px-6">
          <Party title="From" party={from} />
          <Party title={view.customerLabel} party={customer} />
        </div>

        {view.customFields.length > 0 && (
          <div className="border-t py-4 sm:px-6">
            <CustomFieldsPreview fields={view.customFields} />
          </div>
        )}

        <div className="-mx-5 overflow-x-auto border-t px-5 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="text-foreground">
                <th className="w-12 py-3 text-center font-semibold">Ref</th>
                <th className="min-w-40 px-3 py-3 text-left font-semibold">Description</th>
                {view.showQty && <th className="whitespace-nowrap px-3 py-3 text-center font-semibold">Qty</th>}
                {view.showQty && <th className="whitespace-nowrap px-3 py-3 text-center font-semibold">Unit Price</th>}
                {view.showTax && <th className="whitespace-nowrap px-3 py-3 text-center font-semibold">Tax</th>}
                <th className="whitespace-nowrap px-3 py-3 text-center font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i} className="odd:bg-muted">
                  <td className="py-2.5 text-center align-top">{i + 1}</td>
                  <td className="px-3 py-2.5 align-top">{item.description}</td>
                  {view.showQty && <td className="px-3 py-2.5 text-center align-top whitespace-nowrap">{item.quantity}</td>}
                  {view.showQty && (
                    <td className="px-3 py-2.5 text-center align-top whitespace-nowrap">
                      {currency} {fmt(item.price)}
                    </td>
                  )}
                  {view.showTax && <td className="px-3 py-2.5 text-center align-top whitespace-nowrap">{item.tax_rate}%</td>}
                  <td className="px-3 py-2.5 text-center align-top whitespace-nowrap">
                    {currency} {fmt(item.quantity * item.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2 flex flex-col gap-6 border-t pt-5 sm:flex-row sm:justify-between">
          <div className="min-w-0 flex-1">
            {note && (
              <>
                <p className="font-semibold text-foreground">Notes</p>
                <p className="mt-2 whitespace-pre-wrap break-words italic">{note}</p>
              </>
            )}
          </div>
          <div className="w-full shrink-0 sm:w-auto sm:max-w-[70%] sm:min-w-64">
            <div className="flex justify-between gap-4 px-4 py-1.5">
              <span>Sub Total</span>
              <span>
                {currency} {fmt(view.subtotal)}
              </span>
            </div>
            {view.tax > 0 && (
              <div className="flex justify-between gap-4 px-4 py-1.5">
                <span>Taxes</span>
                <span>
                  {currency} {fmt(view.tax)}
                </span>
              </div>
            )}
            {view.discount > 0 && (
              <div className="flex justify-between gap-4 px-4 py-1.5">
                <span>Discount</span>
                <span>
                  − {currency} {fmt(view.discount)}
                </span>
              </div>
            )}
            <div className="mt-1 flex justify-between gap-4 bg-muted px-4 py-2.5 font-semibold text-foreground">
              <span>Total</span>
              <span>
                {currency} {fmt(view.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {paymentDetails && (
        <div className="mt-8 bg-muted px-5 py-5 sm:px-10">
          <div className="bg-white px-5 py-4 sm:px-6 dark:bg-card">
            <p className="font-semibold text-foreground">Payment Details</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{paymentDetails}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 px-5 py-7 sm:px-10">
        <div className="h-px flex-1 bg-foreground/60" />
        <p className="text-sm italic text-foreground">
          {view.isQuote ? "Thanks for considering us!" : "Thanks for your business!"}
        </p>
        <div className="h-px flex-1 bg-foreground/60" />
      </div>

      <div className="space-y-3 bg-muted px-5 py-4 sm:px-10">
        {footerItems.length > 0 && (
          <div className="flex flex-col gap-1 text-center sm:flex-row sm:justify-between sm:gap-6 sm:text-left">
            {footerItems.map((item) => (
              <p key={item} className="min-w-0 break-words first:sm:flex-1 not-first:sm:shrink-0">
                {item}
              </p>
            ))}
          </div>
        )}
        <PoweredBy />
      </div>
    </div>
  )
}
