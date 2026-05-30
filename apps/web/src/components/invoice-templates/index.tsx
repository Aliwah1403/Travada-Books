import { ClassicPreview } from "./classic/preview"
import { InvoiceSharedPdf } from "./pdf"
import type { ClassicDocumentData } from "./classic/preview"

export type { ClassicDocumentData, Participant } from "./classic/preview"

function getPreview(invoiceTemplate?: string | null) {
  // Future: return different preview components based on template name
  // e.g. case "minimal": return MinimalPreview
  switch (invoiceTemplate) {
    default:
      return ClassicPreview
  }
}

export function InvoicePreview({
  data,
  invoiceTemplate,
}: {
  data: ClassicDocumentData
  invoiceTemplate?: string | null
}) {
  const Preview = getPreview(invoiceTemplate)
  return <Preview data={data} />
}

export function InvoicePdf({ data }: { data: ClassicDocumentData }) {
  return <InvoiceSharedPdf data={data} />
}
