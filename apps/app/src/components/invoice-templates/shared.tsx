import { useEffect, useState } from "react"
import QRCode from "qrcode"

export {
  addressLines,
  contactLines,
  formatMoney as fmt,
  getDocumentView,
} from "@travada-books/pdf"

export function DocumentQr({ value, size = 88 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, { margin: 1, width: size * 2 })
      .then((url) => {
        if (!cancelled) setSrc(url)
      })
      .catch(() => {
        if (!cancelled) setSrc(null)
      })
    return () => {
      cancelled = true
    }
  }, [value, size])

  if (!src) return <div style={{ width: size, height: size }} />
  return <img src={src} alt="QR code linking to this document" width={size} height={size} />
}

export function PoweredBy() {
  return (
    <p className="text-center text-[10px] text-muted-foreground">
      Powered by <span className="underline underline-offset-2">Travada Books</span>
    </p>
  )
}
