import React from "npm:react"
import { Text } from "../email-components.ts"
import { EmailLayout, CtaButton, formatMoney, colors } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  orgName: string
  quoteNumber: string | null
  customerName: string
  total: number | null
  currency: string
  viewUrl: string
}

export function QuoteAcceptedEmail({ orgName, quoteNumber, customerName, total, currency, viewUrl }: Props) {
  const label = quoteNumber ? `Quote ${quoteNumber}` : "A quote"

  return (
    <EmailLayout
      preview={`${customerName} accepted ${label} · ${formatMoney(total, currency)}`}
      orgName="Travada Books"
    >
      <Text style={{ margin: "0 0 16px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        Quote Accepted
      </Text>
      <Text style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 300, color: colors.dark, textAlign: "center", fontFamily: font, letterSpacing: "-0.02em" }}>
        {formatMoney(total, currency)}
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: "#059669", textAlign: "center", fontFamily: font, fontWeight: 500 }}>
        {customerName} · {label}
      </Text>

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        {customerName} has accepted {label}{total != null ? ` for ${formatMoney(total, currency)}` : ""}.
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        A draft invoice has been created automatically. Review the details, set your issue and due dates, then send it to {customerName} when you're ready.
      </Text>

      <CtaButton href={viewUrl}>Review Draft Invoice</CtaButton>
    </EmailLayout>
  )
}
