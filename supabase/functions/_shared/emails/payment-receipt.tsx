import React from "npm:react"
import { Text, Link } from "../email-components.ts"
import { EmailLayout, CtaButton, Hr, formatMoney, formatDate, colors } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  orgName: string
  orgLogoUrl?: string | null
  orgEmail?: string | null
  customerName: string
  invoiceNumber: string | null
  amountPaid: number
  currency: string
  paidAt: string
  methodLabel: string
  reference: string
  // What's still owed after this payment; 0 when the invoice is settled.
  balanceDue: number
  publicUrl: string
}

// Sent to the person who paid an invoice online (Paystack). Paystack sends its
// own transaction receipt too; this one comes from the business, ties the
// payment to the invoice and shows what (if anything) is still owed.
export function PaymentReceiptEmail({
  orgName,
  orgLogoUrl,
  orgEmail,
  customerName,
  invoiceNumber,
  amountPaid,
  currency,
  paidAt,
  methodLabel,
  reference,
  balanceDue,
  publicUrl,
}: Props) {
  const label = invoiceNumber ? `Invoice ${invoiceNumber}` : "your invoice"
  const settled = balanceDue <= 0

  const row = (name: string, value: string) => (
    <Text style={{ margin: "0 0 6px", fontSize: 13, color: colors.body, fontFamily: font }}>
      <span style={{ color: colors.muted }}>{name}</span>
      {"  "}
      <strong style={{ color: colors.dark, fontWeight: 500 }}>{value}</strong>
    </Text>
  )

  return (
    <EmailLayout
      preview={`${orgName} received your payment of ${formatMoney(amountPaid, currency)}`}
      orgName={orgName}
      orgLogoUrl={orgLogoUrl}
    >
      <Text style={{ margin: "0 0 16px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        Payment received
      </Text>
      <Text style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 300, color: colors.dark, textAlign: "center", fontFamily: font, letterSpacing: "-0.02em" }}>
        {formatMoney(amountPaid, currency)}
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: settled ? "#059669" : colors.muted, textAlign: "center", fontFamily: font, fontWeight: settled ? 500 : 400 }}>
        {settled ? `${label} is paid in full` : `${formatMoney(balanceDue, currency)} still due on ${label}`}
      </Text>

      <CtaButton href={publicUrl}>View Invoice</CtaButton>

      <Hr style={{ borderColor: colors.border, margin: "8px 0 32px" }} />

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Hi {customerName},
      </Text>
      <Text style={{ margin: "0 0 24px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Thank you. {orgName} has received your payment for {label}.
      </Text>

      {row("Paid on", formatDate(paidAt))}
      {row("Method", methodLabel)}
      {row("Reference", reference)}

      <Text style={{ margin: "24px 0 0", fontSize: 13, color: colors.muted, fontFamily: font }}>
        Questions? Reply to this email
        {orgEmail ?
          <>
            {" "}or contact{" "}
            <Link href={`mailto:${orgEmail}`} style={{ color: colors.muted }}>{orgEmail}</Link>
          </>
        : null}
        .
      </Text>
    </EmailLayout>
  )
}
