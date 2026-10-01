import React from "react"
import { Text, Link } from "@react-email/components"
import { EmailLayout, OutlinedButton, Hr, formatMoney, formatDate, colors } from "./layout"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  orgName: string
  orgLogoUrl?: string | null
  orgEmail: string
  customerName: string
  invoiceNumber: string | null
  dueDate: string | null
  total: number | null
  /** Amount already paid toward this invoice. Optional — when omitted (or 0),
   * behaviour is unchanged and the total is shown as the amount due. When
   * present and > 0, the balance due (total - amountPaid) becomes the
   * headline figure instead of the total. */
  amountPaid?: number | null
  currency: string
  publicUrl: string
}

export function InvoiceReminderEmail({ orgName, orgLogoUrl, orgEmail, customerName, invoiceNumber, dueDate, total, amountPaid, currency, publicUrl }: Props) {
  const label = invoiceNumber ? `Invoice ${invoiceNumber}` : "Invoice"
  const balanceDue = total != null && amountPaid != null ? total - amountPaid : null
  const hasPartialPayment = amountPaid != null && amountPaid > 0 && balanceDue != null
  const displayAmount = hasPartialPayment ? balanceDue : total

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
        {formatMoney(displayAmount, currency)}
      </Text>
      {hasPartialPayment && (
        <Text style={{ margin: "0 0 4px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
          {formatMoney(balanceDue, currency)} remaining of {formatMoney(total, currency)}
        </Text>
      )}
      <Text style={{ margin: "0 0 4px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        Due {formatDate(dueDate)}
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        {label} · from {orgName}
      </Text>

      <OutlinedButton href={publicUrl}>View Invoice</OutlinedButton>

      <Hr style={{ borderColor: colors.border, margin: "8px 0 32px" }} />

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Hi {customerName},
      </Text>
      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        This is a friendly reminder that {label} for <strong style={{ color: colors.dark }}>{formatMoney(displayAmount, currency)}</strong> is due on {formatDate(dueDate)}. Please arrange payment at your earliest convenience.
      </Text>
      <Text style={{ margin: 0, fontSize: 13, color: colors.muted, fontFamily: font }}>
        Already paid? Please disregard this message. Questions?{" "}
        <Link href={`mailto:${orgEmail}`} style={{ color: colors.muted }}>{orgEmail}</Link>
      </Text>
    </EmailLayout>
  )
}
