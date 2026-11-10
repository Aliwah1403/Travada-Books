import type { ClassicDocumentData } from "@travada-books/pdf"
import {
  addressLines,
  contactLines,
  DocumentQr,
  fmt,
  getDocumentView,
  PoweredBy,
  taxIdLine,
} from "../shared"

const RULE = "border-t border-foreground/70"

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 font-semibold text-foreground">{children}</p>
}

export function LedgerPreview({ data }: { data: ClassicDocumentData }) {
  const { from, customer, currency, number, lineItems, note, paymentDetails, publicUrl, status } = data
  const view = getDocumentView(data)
  const contact = contactLines(from)
  const totalsRows = [
    { label: "Sub Total", value: fmt(view.subtotal) },
    ...(view.tax > 0 ? [{ label: "Tax", value: fmt(view.tax) }] : []),
    ...(view.discount > 0 ? [{ label: "Discount", value: `− ${fmt(view.discount)}` }] : []),
    { label: "Total", value: `${currency} ${fmt(view.total)}`, strong: true },
  ]

  return (
    <div className="rounded-lg border bg-white p-5 font-heading text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere] shadow-sm sm:p-10 dark:bg-card">
      <div className="flex items-start justify-between gap-4">
        {from.logo_url ? (
          <img
            src={from.logo_url}
            alt={from.name ?? ""}
            className="h-10 w-auto max-w-[180px] object-contain"
          />
        ) : (
          <p className="text-xl font-bold tracking-tight text-foreground">
            {from.name ?? "Your Business"}
          </p>
        )}
        <div className="text-right">
          <p className="text-xl font-bold text-foreground">{view.label}</p>
          {status === "canceled" && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-destructive">
              Canceled
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 pb-5 sm:grid-cols-2">
        <div>
          <Heading>{from.name ?? "Your Business"}</Heading>
          {addressLines(from).map((line) => (
            <p key={line}>{line}</p>
          ))}
          {taxIdLine(from) && <p>{taxIdLine(from)}</p>}
        </div>
        {contact.length > 0 && (
          <div>
            <Heading>Contact</Heading>
            {contact.map((line) => (
              <p key={line} className="break-words">
                {line}
              </p>
            ))}
          </div>
        )}
      </div>

      <dl className={`${RULE} grid grid-cols-2 gap-4 py-4 sm:grid-cols-4`}>
        {[
          { label: "Total", value: `${currency} ${fmt(view.total)}` },
          ...(data.secondaryDate !== undefined
            ? [{ label: view.secondaryDateLabel, value: view.formatDate(data.secondaryDate) }]
            : []),
          { label: `${view.isQuote ? "Quote" : "Invoice"} #`, value: number ?? "—" },
          { label: `${view.isQuote ? "Quote" : "Invoice"} Date`, value: view.formatDate(data.issueDate) },
        ].map((item) => (
          <div key={item.label}>
            <dt className="mb-1.5 font-semibold capitalize text-foreground">{item.label}</dt>
            <dd className="break-words">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className={`${RULE} grid grid-cols-1 gap-5 py-4 sm:grid-cols-2`}>
        <div>
          <Heading>{view.customerLabel}</Heading>
          <p className="text-foreground">{customer.name ?? "—"}</p>
          {addressLines(customer).map((line) => (
            <p key={line}>{line}</p>
          ))}
          {contactLines(customer).map((line) => (
            <p key={line} className="break-words">
              {line}
            </p>
          ))}
        </div>
        {view.customFields.length > 0 && (
          <div>
            <Heading>Details</Heading>
            {view.customFields.map((field) => (
              <div key={field.id} className="flex justify-between gap-3">
                <span className="max-w-1/2 shrink-0">{field.label}</span>
                <span className="min-w-0 text-right break-words text-foreground">{field.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-y border-foreground/70 text-foreground">
              <th className="w-6 py-2.5 text-left font-semibold">#</th>
              <th className="min-w-40 py-2.5 text-left font-semibold">Description</th>
              {view.showQty && <th className="whitespace-nowrap py-2.5 pl-4 text-right font-semibold">Qty</th>}
              {view.showQty && <th className="whitespace-nowrap py-2.5 pl-4 text-right font-semibold">Rate</th>}
              {view.showTax && <th className="whitespace-nowrap py-2.5 pl-4 text-right font-semibold">Tax</th>}
              <th className="whitespace-nowrap py-2.5 pl-4 text-right font-semibold">Total ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => (
              <tr key={i} className="border-b border-foreground/70">
                <td className="py-2 align-top">{i + 1}</td>
                <td className="py-2 align-top">{item.description}</td>
                {view.showQty && <td className="whitespace-nowrap py-2 pl-4 text-right align-top">{item.quantity}</td>}
                {view.showQty && <td className="whitespace-nowrap py-2 pl-4 text-right align-top">{fmt(item.price)}</td>}
                {view.showTax && <td className="whitespace-nowrap py-2 pl-4 text-right align-top">{item.tax_rate}%</td>}
                <td className="whitespace-nowrap py-2 pl-4 text-right align-top">{fmt(item.quantity * item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:justify-between">
        <div className="min-w-0 flex-1">
          {note && (
            <>
              <Heading>Notes</Heading>
              <p className="whitespace-pre-wrap break-words">{note}</p>
            </>
          )}
        </div>
        <div className="w-full shrink-0 sm:w-auto sm:max-w-[70%] sm:min-w-56">
          {totalsRows.map((row) => (
            <div
              key={row.label}
              className="flex justify-between gap-4 border-b border-foreground/70 py-1.5"
            >
              <span className="font-semibold text-foreground">{row.label}</span>
              <span className={row.strong ? "font-semibold text-foreground" : undefined}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {(paymentDetails || publicUrl) && (
        <div className={`${RULE} mt-10 flex items-start justify-between gap-6 pt-4`}>
          <div className="min-w-0">
            {paymentDetails && (
              <>
                <Heading>Payment Info</Heading>
                <p className="whitespace-pre-wrap break-words">{paymentDetails}</p>
              </>
            )}
          </div>
          {publicUrl && (
            <div className="shrink-0 text-right">
              <div className="inline-block bg-white p-1">
                <DocumentQr value={publicUrl} />
              </div>
              <p className="mt-1 text-[10px]">Scan to view online</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <PoweredBy />
      </div>
    </div>
  )
}
