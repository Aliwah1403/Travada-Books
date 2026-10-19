import React from "npm:react"
import { Text } from "../email-components.ts"
import { EmailLayout, CtaButton, formatMoney, colors } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  invoiceNumber: string | null
  customerName: string
  amount: number
  balanceDue: number
  currency: string
  viewUrl: string
}

// To the business when a customer part-pays an invoice online. The fully-paid
// case is InvoicePaidEmail (notify-invoice-paid).
export function InvoicePaymentReceivedEmail({ invoiceNumber, customerName, amount, balanceDue, currency, viewUrl }: Props) {
  const label = invoiceNumber ? `Invoice ${invoiceNumber}` : "Invoice"

  return (
    <EmailLayout
      preview={`${customerName} paid ${formatMoney(amount, currency)} towards ${label}`}
      orgName="Travada Books"
    >
      <Text style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        Payment received<br />on {label}
      </Text>
      <Text style={{ margin: "0 0 8px", paddingTop: 10, fontSize: 32, fontWeight: 300, color: colors.dark, textAlign: "center", fontFamily: font, letterSpacing: "-0.02em" }}>
        {formatMoney(amount, currency)}
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        {formatMoney(balanceDue, currency)} still due
      </Text>

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        <strong style={{ color: colors.dark }}>{customerName}</strong> paid part of {label} online. The payment is
        recorded on the invoice and the remaining balance stays open.
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        You'll get another email when the invoice is paid in full.
      </Text>

      <CtaButton href={viewUrl}>View invoice details</CtaButton>
    </EmailLayout>
  )
}
