import { normalizeDocumentTemplate, type ClassicDocumentData } from "@travada-books/pdf"
import { BandedPreview } from "./banded/preview"
import { ClassicPreview } from "./classic/preview"
import { LedgerPreview } from "./ledger/preview"
import { MonoPreview } from "./mono/preview"

export function InvoicePreview({
  data,
  invoiceTemplate,
}: {
  data: ClassicDocumentData
  invoiceTemplate?: string | null
}) {
  switch (normalizeDocumentTemplate(invoiceTemplate ?? data.template)) {
    case "ledger":
      return <LedgerPreview data={data} />
    case "banded":
      return <BandedPreview data={data} />
    case "mono":
      return <MonoPreview data={data} />
    default:
      return <ClassicPreview data={data} />
  }
}
