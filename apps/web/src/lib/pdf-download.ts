import { pdf } from "@react-pdf/renderer"
import type { ReactElement } from "react"

export async function downloadPdf(element: ReactElement, filename: string): Promise<void> {
  const blob = await pdf(element).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
