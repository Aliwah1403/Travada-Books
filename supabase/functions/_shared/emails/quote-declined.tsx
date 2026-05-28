import React from "npm:react"
import { Text, Section } from "../email-components.ts"
import { EmailLayout, CtaButton, formatMoney, colors } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  orgName: string
  quoteNumber: string | null
  customerName: string
  total: number | null
  currency: string
  declineReason?: string | null
  viewUrl: string
}

export function QuoteDeclinedEmail({ orgName, quoteNumber, customerName, total, currency, declineReason, viewUrl }: Props) {
  const label = quoteNumber ? `Quote ${quoteNumber}` : "A quote"

  return (
    <EmailLayout
      preview={`${customerName} declined ${label}`}
      orgName="Travada Books"
    >
      <Text style={{ margin: "0 0 16px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        Quote Declined
      </Text>
      <Text style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 300, color: colors.dark, textAlign: "center", fontFamily: font, letterSpacing: "-0.02em" }}>
        {formatMoney(total, currency)}
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        {customerName} · {label}
      </Text>

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        {customerName} has declined {label}{total != null ? ` (${formatMoney(total, currency)})` : ""}. You can edit the quote and resend it from your {orgName} account if you'd like to follow up.
      </Text>

      {declineReason && (
        <Section style={{ backgroundColor: "#F9FAFB", borderRadius: 4, padding: "14px 18px", marginBottom: 40 }}>
          <Text style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: font }}>
            Reason given
          </Text>
          <Text style={{ margin: 0, fontSize: 13, color: colors.body, lineHeight: "1.5", fontFamily: font }}>
            {declineReason}
          </Text>
        </Section>
      )}

      <CtaButton href={viewUrl}>View Quote</CtaButton>
    </EmailLayout>
  )
}
