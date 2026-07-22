import React from "npm:react"
import { Text } from "../email-components.ts"
import { EmailLayout, CtaButton, colors } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  customerName: string
  frequency: string
  failureCount: number
  reason: string | null
  viewUrl: string
}

export function RecurringPausedEmail({ customerName, frequency, failureCount, reason, viewUrl }: Props) {
  return (
    <EmailLayout
      preview={`Recurring invoice to ${customerName} has been paused`}
      orgName="Travada Books"
    >
      <Text style={{ margin: "0 0 40px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        Recurring invoice to {customerName}<br />has been paused
      </Text>

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Automatic {frequency} invoicing for <strong style={{ color: colors.dark }}>{customerName}</strong> stopped after {failureCount} failed attempts in a row.
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        No further invoices will be generated for this series until you review and resume it.
      </Text>

      {reason && (
        <Text style={{ margin: "0 0 40px", padding: "12px 16px", backgroundColor: "#F9FAFB", border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 13, color: colors.muted, lineHeight: "1.5", fontFamily: font }}>
          Last error: {reason}
        </Text>
      )}

      <CtaButton href={viewUrl}>Review &amp; resume</CtaButton>
    </EmailLayout>
  )
}
