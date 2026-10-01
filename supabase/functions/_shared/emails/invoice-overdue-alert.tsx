import React from "npm:react"
import { Text } from "../email-components.ts"
import { EmailLayout, CtaButton, formatMoney, colors } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  invoiceNumber: string | null
  customerName: string
  total: number | null
  /** Amount already paid toward this invoice. Optional — when omitted (or 0),
   * behaviour is unchanged and the total is shown as the amount due. When
   * present and > 0, the balance due (total - amountPaid) becomes the
   * headline figure instead of the total. */
  amountPaid?: number | null
  currency: string
  viewUrl: string
}

export function InvoiceOverdueAlertEmail({ invoiceNumber, customerName, total, amountPaid, currency, viewUrl }: Props) {
  const label = invoiceNumber ? `Invoice ${invoiceNumber}` : "Invoice"
  const balanceDue = total != null && amountPaid != null ? total - amountPaid : null
  const hasPartialPayment = amountPaid != null && amountPaid > 0 && balanceDue != null
  const displayAmount = hasPartialPayment ? balanceDue : total

  return (
    <EmailLayout
      preview={`${label} to ${customerName} is now overdue`}
      orgName="Travada Books"
    >
      <Text style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        {label}<br />is now overdue
      </Text>
      <Text style={{ margin: "0 0 8px", paddingTop: 10, fontSize: 32, fontWeight: 300, color: colors.dark, textAlign: "center", fontFamily: font, letterSpacing: "-0.02em" }}>
        {formatMoney(displayAmount, currency)}
      </Text>
      {hasPartialPayment && (
        <Text style={{ margin: "0 0 8px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
          {formatMoney(balanceDue, currency)} remaining of {formatMoney(total, currency)}
        </Text>
      )}
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        {customerName}
      </Text>

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        {label} to <strong style={{ color: colors.dark }}>{customerName}</strong> is now overdue. We've checked your account but haven't found a matching transaction.
      </Text>
      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Please review the invoice details page to verify if payment has been made through another method.
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        If needed, you can send a payment reminder to your customer or update the invoice status manually if it has already been paid.
      </Text>

      <CtaButton href={viewUrl}>View invoice details</CtaButton>
    </EmailLayout>
  )
}
