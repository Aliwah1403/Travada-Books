import { format } from "date-fns"
import type { ClassicDocumentData } from "@travada-books/pdf"
import type { SelectedCustomer } from "@/components/invoices/customer-combobox"
import type { CustomField } from "@/components/invoices/custom-fields"
import type { UserOrg } from "@/contexts/auth-context"
import { computeDocumentTotals, type LineItem } from "@/lib/document-totals"
import { InvoicePreview } from "./index"

type EditorDocumentPreviewProps = {
  kind: "invoice" | "quote"
  template: string
  number: string
  issueDate: Date | undefined
  secondaryDate: Date | undefined
  currency: string
  items: LineItem[]
  discountType: "%" | "fixed"
  discountValue: string
  vatRate: string
  paymentDetails?: string
  notes: string
  dateFormat?: string
  showTaxColumn?: boolean
  showQtyColumn?: boolean
  customer: SelectedCustomer | null
  org: UserOrg | null
  logoUrl: string | null
  customFields: CustomField[]
}

const toDateString = (d: Date | undefined) => (d ? format(d, "yyyy-MM-dd") : null)

// The create/edit pages draw the document from unsaved form state through the
// same layouts the customer sees, so what is on screen is what gets sent.
export function EditorDocumentPreview({
  kind,
  template,
  number,
  issueDate,
  secondaryDate,
  currency,
  items,
  discountType,
  discountValue,
  vatRate,
  paymentDetails,
  notes,
  dateFormat,
  showTaxColumn,
  showQtyColumn,
  customer,
  org,
  logoUrl,
  customFields,
}: EditorDocumentPreviewProps) {
  const totals = computeDocumentTotals(items, discountType, discountValue, vatRate)
  const isQuote = kind === "quote"

  const data: ClassicDocumentData = {
    template,
    label: isQuote ? "QUOTATION" : "INVOICE",
    number: number || (isQuote ? "QUO-0001" : "INV-0001"),
    currency,
    issueDate: toDateString(issueDate),
    secondaryDate: toDateString(secondaryDate),
    secondaryDateLabel: isQuote ? "Valid until:" : "Due date:",
    customerLabel: isQuote ? "Prepared For" : "Bill To",
    from: {
      name: org?.name,
      logo_url: logoUrl,
      address_line1: org?.address_line1,
      address_line2: org?.address_line2,
      city: org?.city,
      zip: org?.zip,
      country_code: org?.country_code,
      phone: org?.phone,
      email: org?.email,
      tax_id: org?.tax_id,
      tax_id_label: org?.tax_id_label ?? "Tax ID",
    },
    customer: customer ?? { name: "No customer selected" },
    lineItems: items.map((item) => ({
      description: item.description || "—",
      quantity: parseFloat(item.qty) || 0,
      price: parseFloat(item.rate) || 0,
      tax_rate: parseFloat(item.tax) || 0,
    })),
    subtotal: totals.subtotal,
    taxAmount: totals.tax_amount,
    discount: totals.discount,
    total: totals.total,
    note: notes || null,
    paymentDetails: paymentDetails || null,
    customFields,
    dateFormat: dateFormat ?? null,
    showTaxColumn: showTaxColumn ?? null,
    showQtyColumn: showQtyColumn ?? null,
  }

  return <InvoicePreview data={data} />
}
