import React from "npm:react"
import { Text } from "../email-components.ts"
import { EmailLayout, CtaButton, formatMoney, colors } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  invoiceNumber: string | null
  customerName: string
  total: number | null
  currency: string
  viewUrl: string
}

export function InvoicePaidEmail({ invoiceNumber, customerName, total, currency, viewUrl }: Props) {
  const label = invoiceNumber ? `Invoice ${invoiceNumber}` : "Invoice"

  return (
    <EmailLayout
      preview={`${label} from ${customerName} has been marked as paid`}
      orgName="Travada Books"
    >
      <Text style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        {label}<br />has been Paid
      </Text>
      <Text style={{ margin: "0 0 8px", paddingTop: 10, fontSize: 32, fontWeight: 300, color: colors.dark, textAlign: "center", fontFamily: font, letterSpacing: "-0.02em" }}>
        {formatMoney(total, currency)}
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: "#059669", textAlign: "center", fontFamily: font, fontWeight: 500 }}>
        {customerName}
      </Text>

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        <strong style={{ color: colors.dark }}>{customerName}</strong> has paid {label}. The invoice has been marked as paid in your records.
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Please take a moment to check that everything looks right on the invoice details page.
      </Text>

      <CtaButton href={viewUrl}>View invoice details</CtaButton>
    </EmailLayout>
  )
}
