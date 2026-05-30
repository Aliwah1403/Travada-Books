import React from "react";
import { Text, Link } from "@react-email/components";
import {
  EmailLayout,
  OutlinedButton,
  Hr,
  formatMoney,
  formatDate,
  colors,
} from "./layout";

interface Props {
  orgName: string;
  orgLogoUrl?: string | null;
  orgEmail: string;
  customerName: string;
  invoiceNumber: string | null;
  dueDate: string | null;
  total: number | null;
  currency: string;
  publicUrl: string;
}

export default function InvoiceReminderEmail({
  orgName = "Acme Ltd",
  orgLogoUrl = null,
  orgEmail = "billing@acme.com",
  customerName = "John Doe",
  invoiceNumber = "INV-0008",
  dueDate = "2025-04-15",
  total = 65000,
  currency = "KES",
  publicUrl = "https://books.travadasys.com/i/demo",
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const label = invoiceNumber ? `Invoice ${invoiceNumber}` : "Invoice";

  return (
    <EmailLayout
      preview={`Payment reminder: ${label} from ${orgName}`}
      orgName={orgName}
      orgLogoUrl={orgLogoUrl}
    >
      {/* Heading */}
      <Text
        style={{
          margin: "0 0 16px",
          fontSize: 24,
          fontWeight: 600,
          color: colors.dark,
          letterSpacing: "-0.02em",
          textAlign: "center",
          fontFamily: font,
        }}
      >
        Payment Reminder
      </Text>

      {/* Amount */}
      <Text
        style={{
          margin: "0 0 8px",
          fontSize: 32,
          fontWeight: 300,
          color: colors.dark,
          textAlign: "center",
          fontFamily: font,
          letterSpacing: "-0.02em",
        }}
      >
        {formatMoney(total, currency)}
      </Text>

      {/* Meta */}
      <Text
        style={{
          margin: "0 0 4px",
          fontSize: 13,
          color: colors.muted,
          textAlign: "center",
          fontFamily: font,
        }}
      >
        Due {formatDate(dueDate)}
      </Text>
      <Text
        style={{
          margin: "0 0 40px",
          fontSize: 13,
          color: colors.muted,
          textAlign: "center",
          fontFamily: font,
        }}
      >
        {label} · from {orgName}
      </Text>

      {/* CTA */}
      <OutlinedButton href={publicUrl}>View Invoice</OutlinedButton>

      {/* Divider */}
      <Hr style={{ borderColor: colors.border, margin: "8px 0 32px" }} />

      {/* Body */}
      <Text
        style={{
          margin: "0 0 16px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.6",
          fontFamily: font,
        }}
      >
        Hi {customerName},
      </Text>
      <Text
        style={{
          margin: "0 0 16px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.6",
          fontFamily: font,
        }}
      >
        This is a friendly reminder that {label} for{" "}
        <strong style={{ color: colors.dark }}>{formatMoney(total, currency)}</strong>{" "}
        is due on {formatDate(dueDate)}. Please arrange payment at your earliest convenience.
      </Text>
      <Text
        style={{
          margin: 0,
          fontSize: 13,
          color: colors.muted,
          fontFamily: font,
        }}
      >
        Already paid? Please disregard this message. Questions?{" "}
        <Link href={`mailto:${orgEmail}`} style={{ color: colors.muted }}>
          {orgEmail}
        </Link>
      </Text>
    </EmailLayout>
  );
}
