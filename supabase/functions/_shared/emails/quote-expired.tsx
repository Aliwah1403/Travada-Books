import React from "npm:react"
import { Text } from "../email-components.ts"
import { EmailLayout, CtaButton, formatMoney, formatDate, colors } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  quoteNumber: string | null
  customerName: string
  total: number | null
  currency: string
  validUntil: string
  viewUrl: string
}

export function QuoteExpiredEmail({ quoteNumber, customerName, total, currency, validUntil, viewUrl }: Props) {
  const label = quoteNumber ? `Quote ${quoteNumber}` : "A quote"

  return (
    <EmailLayout
      preview={`${label} to ${customerName} expired without a response`}
      orgName="Travada Books"
    >
      <Text style={{ margin: "0 0 16px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        Quote Expired
      </Text>
      <Text style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 300, color: colors.dark, textAlign: "center", fontFamily: font, letterSpacing: "-0.02em" }}>
        {formatMoney(total, currency)}
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        {customerName} · {label}
      </Text>

      <Text style={{ margin: "0 0 40px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        {label} to <strong style={{ color: colors.dark }}>{customerName}</strong> expired on {formatDate(validUntil)} without a response. You can duplicate the quote with a new valid-until date if you'd like to follow up.
      </Text>

      <CtaButton href={viewUrl}>View Quote</CtaButton>
    </EmailLayout>
  )
}
