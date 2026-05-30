import { ClassicPreview } from "./classic/preview"
import { InvoiceSharedPdf } from "./pdf"
import type { ClassicDocumentData } from "./classic/preview"

export type { ClassicDocumentData, Participant } from "./classic/preview"

function getPreview(invoiceTemplate: string | null | undefined, data: ClassicDocumentData) {
  switch (invoiceTemplate) {
    default:
      return <ClassicPreview data={data} />
  }
}

export function InvoicePreview({
  data,
  invoiceTemplate,
}: {
  data: ClassicDocumentData
  invoiceTemplate?: string | null
}) {
  return getPreview(invoiceTemplate, data)
}

export function InvoicePdf({ data }: { data: ClassicDocumentData }) {
  return <InvoiceSharedPdf data={data} />
}
