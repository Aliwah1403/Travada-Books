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
  quoteNumber: string | null;
  validUntil: string | null;
  total: number | null;
  currency: string;
  publicUrl: string;
  note?: string | null;
}

export default function QuoteSentEmail({
  orgName = "Acme Ltd",
  orgLogoUrl = null,
  orgEmail = "billing@acme.com",
  customerName = "John Doe",
  quoteNumber = "QT-0005",
  validUntil = "2025-05-31",
  total = 120000,
  currency = "KES",
  publicUrl = "https://books.travadasys.com/q/demo",
  note = null,
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const label = quoteNumber ? `Quote ${quoteNumber}` : "Quote";

  return (
    <EmailLayout
      preview={`${label} from ${orgName} · ${formatMoney(total, currency)}`}
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
        {label}
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
      {validUntil && (
        <Text
          style={{
            margin: "0 0 4px",
            fontSize: 13,
            color: colors.muted,
            textAlign: "center",
            fontFamily: font,
          }}
        >
          Valid until {formatDate(validUntil)}
        </Text>
      )}
      <Text
        style={{
          margin: "0 0 40px",
          fontSize: 13,
          color: colors.muted,
          textAlign: "center",
          fontFamily: font,
        }}
      >
        from {orgName}
      </Text>

      {/* CTA */}
      <OutlinedButton href={publicUrl}>Review Quote</OutlinedButton>

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
        {orgName} has sent you a quote for{" "}
        <strong style={{ color: colors.dark }}>{formatMoney(total, currency)}</strong>.{" "}
        Please review the details and accept or decline at your convenience.
      </Text>
      {note && (
        <Text
          style={{
            margin: "0 0 16px",
            fontSize: 13,
            color: colors.muted,
            lineHeight: "1.5",
            fontStyle: "italic",
            fontFamily: font,
          }}
        >
          {note}
        </Text>
      )}
      <Text
        style={{
          margin: 0,
          fontSize: 13,
          color: colors.muted,
          fontFamily: font,
        }}
      >
        Questions? Reply to this email or contact{" "}
        <Link href={`mailto:${orgEmail}`} style={{ color: colors.muted }}>
          {orgEmail}
        </Link>
      </Text>
    </EmailLayout>
  );
}
