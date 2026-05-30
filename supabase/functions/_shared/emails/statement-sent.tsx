import React from "npm:react"
import { Text, Link } from "../email-components.ts"
import { EmailLayout, CtaButton, Hr, formatMoney, formatDate, colors } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  orgName: string
  orgLogoUrl?: string | null
  orgEmail: string
  customerName: string
  dateFrom: string | null
  dateTo: string | null
  totalOwing: number
  currency: string
  publicUrl: string
}

export function StatementSentEmail({ orgName, orgLogoUrl, orgEmail, customerName, dateFrom, dateTo, totalOwing, currency, publicUrl }: Props) {
  const period = [formatDate(dateFrom), formatDate(dateTo)].join(" – ")

  return (
    <EmailLayout
      preview={`Account statement from ${orgName} · ${formatMoney(totalOwing, currency)} outstanding`}
      orgName={orgName}
      orgLogoUrl={orgLogoUrl}
    >
      <Text style={{ margin: "0 0 16px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        Account Statement
      </Text>
      <Text style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 300, color: colors.dark, textAlign: "center", fontFamily: font, letterSpacing: "-0.02em" }}>
        {formatMoney(totalOwing, currency)}
      </Text>
      <Text style={{ margin: "0 0 4px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        {period}
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        from {orgName}
      </Text>

      <CtaButton href={publicUrl}>View Statement</CtaButton>

      <Hr style={{ borderColor: colors.border, margin: "8px 0 32px" }} />

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Hi {customerName},
      </Text>
      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Please find your account statement for the period {period}. Your current outstanding balance is <strong style={{ color: colors.dark }}>{formatMoney(totalOwing, currency)}</strong>. View the full statement for a detailed breakdown of all invoices and payments.
      </Text>
      <Text style={{ margin: 0, fontSize: 13, color: colors.muted, fontFamily: font }}>
        Questions? Reply to this email or contact{" "}
        <Link href={`mailto:${orgEmail}`} style={{ color: colors.muted }}>{orgEmail}</Link>
      </Text>
    </EmailLayout>
  )
}
