import { useSyncExternalStore } from "react"

import type { ClassicDocumentData } from "@travada-books/pdf"
import { addressLines, contactLines, formatMoney, getDocumentView, taxIdLine } from "@travada-books/pdf/document-view"
import { Separator } from "@travada-books/ui/components/separator"

function noopSubscribe() {
  return () => {}
}

// Same formatting as the PDF's fmtAmt (packages/pdf/src/templates/invoice-pdf.tsx)
// so zero-decimal currencies such as UGX read the same in both. The PDF uses
// the browser's locale; the prerender can't know it, so that fixed locale
// holds until hydration is done.
function useMoney(currency: string) {
  const locale = useSyncExternalStore(
    noopSubscribe,
    () => undefined as string | undefined,
    () => "en-KE",
  )
  return (n: number) => {
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "code" }).format(n)
    } catch {
      return `${currency} ${formatMoney(n)}`
    }
  }
}

// The app's Classic preview (apps/app/src/components/invoice-templates/classic),
// showing only what the Classic PDF prints: no logo placeholder, no footer
// credit, and the tax number under the business details, as on the PDF.
export function ClassicPreview({ data }: { data: ClassicDocumentData }) {
  const view = getDocumentView(data)
  const money = useMoney(data.currency)
  const { from, customer, lineItems, number, issueDate, secondaryDate, paymentDetails, note } = data

  return (
    <div className="border border-line bg-panel p-5 text-sm [overflow-wrap:anywhere] text-ink shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {from.logo_url ? (
            <img src={from.logo_url} alt="" className="mb-2 h-12 w-auto max-w-[140px] object-contain" />
          ) : null}
          <div className="space-y-0.5">
            <p className="font-semibold">{from.name ?? "Your Business"}</p>
            {[...addressLines(from), ...contactLines(from), taxIdLine(from)].filter((line): line is string => Boolean(line)).map((line, i) => (
              <p key={i} className="text-xs text-ink-muted">
                {line}
              </p>
            ))}
          </div>
        </div>
        <div className="min-w-0 sm:max-w-1/2 sm:text-right">
          <p className="text-2xl font-bold">{view.label}</p>
          <p className="text-xs text-ink-muted">{number ?? "—"}</p>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">{view.customerLabel}</p>
          <div className="mt-1.5 space-y-0.5">
            <p className="font-medium">{customer.name ?? "—"}</p>
            {[...addressLines(customer), ...contactLines(customer)].map((line, i) => (
              <p key={i} className="text-xs text-ink-muted">
                {line}
              </p>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-ink-muted">Date</span>
            <span className="font-medium">{view.formatDate(issueDate)}</span>
          </div>
          {secondaryDate ? (
            <div className="flex justify-between gap-4 text-xs">
              <span className="text-ink-muted">{view.secondaryDateLabel}</span>
              <span className="font-medium">{view.formatDate(secondaryDate)}</span>
            </div>
          ) : null}
        </div>
      </div>

      <Separator className="my-6" />

      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[420px] text-xs">
          <thead>
            <tr className="border-b border-line text-ink-muted">
              <th className="min-w-32 pb-3 text-left font-medium">Description</th>
              <th className="pb-3 pl-4 text-right font-medium whitespace-nowrap">Qty</th>
              <th className="pb-3 pl-4 text-right font-medium whitespace-nowrap">Unit Price</th>
              {view.showTax ? <th className="pb-3 pl-4 text-right font-medium whitespace-nowrap">Tax</th> : null}
              <th className="pb-3 pl-4 text-right font-medium whitespace-nowrap">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 ? (
              <tr className="border-b border-dashed border-line">
                <td colSpan={view.showTax ? 5 : 4} className="py-3 text-ink-subtle">
                  Your line items appear here.
                </td>
              </tr>
            ) : null}
            {lineItems.map((item, i) => (
              <tr key={i} className="border-b border-dashed border-line">
                <td className="py-3">{item.description}</td>
                <td className="py-3 pl-4 text-right whitespace-nowrap">{item.quantity}</td>
                <td className="py-3 pl-4 text-right whitespace-nowrap">{money(item.price)}</td>
                {view.showTax ? <td className="py-3 pl-4 text-right whitespace-nowrap">{item.tax_rate}%</td> : null}
                <td className="py-3 pl-4 text-right font-medium whitespace-nowrap">{money(item.quantity * item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 ml-auto flex w-fit max-w-full min-w-48 flex-col gap-1.5 text-xs">
        <div className="flex justify-between gap-6">
          <span className="text-ink-muted">Subtotal</span>
          <span>{money(view.subtotal)}</span>
        </div>
        {view.tax > 0 ? (
          <div className="flex justify-between gap-6">
            <span className="text-ink-muted">Tax</span>
            <span>{money(view.tax)}</span>
          </div>
        ) : null}
        {view.discount > 0 ? (
          <div className="flex justify-between gap-6">
            <span className="text-ink-muted">Discount</span>
            <span>-{money(view.discount)}</span>
          </div>
        ) : null}
        <Separator className="my-1" />
        <div className="flex justify-between gap-6 text-sm font-semibold">
          <span>Total Due</span>
          <span>{money(view.total)}</span>
        </div>
      </div>

      {paymentDetails ? (
        <>
          <Separator className="my-6" />
          <div>
            <p className="text-xs font-medium">Payment Details</p>
            <p className="mt-1 text-xs whitespace-pre-wrap text-ink-muted">{paymentDetails}</p>
          </div>
        </>
      ) : null}

      {note ? (
        <>
          <Separator className="my-6" />
          <div>
            <p className="text-xs font-medium">Notes</p>
            <p className="mt-1 text-xs whitespace-pre-wrap text-ink-muted">{note}</p>
          </div>
        </>
      ) : null}
    </div>
  )
}
