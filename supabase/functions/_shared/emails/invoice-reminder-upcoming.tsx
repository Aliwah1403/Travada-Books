import React from "npm:react"
import { Text } from "../email-components.ts"
import { EmailLayout, CtaButton, formatMoney, colors } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  invoiceNumber: string | null
  customerName: string
  balanceDue: number | null
  currency: string
  viewUrl: string
}

export function InvoiceReminderUpcomingEmail({ invoiceNumber, customerName, balanceDue, currency, viewUrl }: Props) {
  const label = invoiceNumber ? `Invoice ${invoiceNumber}` : "an invoice"

  return (
    <EmailLayout
      preview={`A reminder for ${label} goes out to ${customerName} tomorrow`}
      orgName="Travada Books"
    >
      <Text style={{ margin: "0 0 16px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        Reminder going out tomorrow
      </Text>
      <Text style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 300, color: colors.dark, textAlign: "center", fontFamily: font, letterSpacing: "-0.02em" }}>
        {formatMoney(balanceDue, currency)}
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        {customerName} · {label}
      </Text>

      <Text style={{ margin: "0 0 40px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Tomorrow we'll send {customerName} an automatic reminder for {label} (balance due {formatMoney(balanceDue, currency)}). Open the invoice below to turn this reminder off before then.
      </Text>

      <CtaButton href={viewUrl}>Open invoice</CtaButton>
    </EmailLayout>
  )
}
