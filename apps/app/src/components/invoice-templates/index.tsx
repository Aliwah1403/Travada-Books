import { ClassicPreview } from "./classic/preview"
import type { ClassicDocumentData } from "@travada-books/pdf"

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
