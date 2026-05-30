import React from "npm:react"
import { Text, Link } from "../email-components.ts"
import { EmailLayout, CtaButton, Hr, formatMoney, formatDate, colors } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  orgName: string
  orgLogoUrl?: string | null
  orgEmail: string
  customerName: string
  invoiceNumber: string | null
  dueDate: string | null
  total: number | null
  currency: string
  publicUrl: string
}

export function InvoiceReminderEmail({ orgName, orgLogoUrl, orgEmail, customerName, invoiceNumber, dueDate, total, currency, publicUrl }: Props) {
  const label = invoiceNumber ? `Invoice ${invoiceNumber}` : "Invoice"

  return (
    <EmailLayout
      preview={`Payment reminder: ${label} from ${orgName}`}
      orgName={orgName}
      orgLogoUrl={orgLogoUrl}
    >
      <Text style={{ margin: "0 0 16px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        Payment Reminder
      </Text>
      <Text style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 300, color: colors.dark, textAlign: "center", fontFamily: font, letterSpacing: "-0.02em" }}>
        {formatMoney(total, currency)}
      </Text>
      <Text style={{ margin: "0 0 4px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        Due {formatDate(dueDate)}
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        {label} · from {orgName}
      </Text>

      <CtaButton href={publicUrl}>View Invoice</CtaButton>

      <Hr style={{ borderColor: colors.border, margin: "8px 0 32px" }} />

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Hi {customerName},
      </Text>
      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        This is a friendly reminder that {label} for <strong style={{ color: colors.dark }}>{formatMoney(total, currency)}</strong> is due on {formatDate(dueDate)}. Please arrange payment at your earliest convenience.
      </Text>
      <Text style={{ margin: 0, fontSize: 13, color: colors.muted, fontFamily: font }}>
        Already paid? Please disregard this message. Questions?{" "}
        <Link href={`mailto:${orgEmail}`} style={{ color: colors.muted }}>{orgEmail}</Link>
      </Text>
    </EmailLayout>
  )
}
