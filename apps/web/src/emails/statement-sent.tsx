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
  dateFrom: string | null;
  dateTo: string | null;
  totalOwing: number;
  currency: string;
  publicUrl: string;
}

export default function StatementSentEmail({
  orgName = "Acme Ltd",
  orgLogoUrl = null,
  orgEmail = "billing@acme.com",
  customerName = "John Doe",
  dateFrom = "2025-01-01",
  dateTo = "2025-05-31",
  totalOwing = 215000,
  currency = "KES",
  publicUrl = "https://books.travadasys.com/s/demo",
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const period = [formatDate(dateFrom), formatDate(dateTo)].join(" – ");

  return (
    <EmailLayout
      preview={`Account statement from ${orgName} · ${formatMoney(totalOwing, currency)} outstanding`}
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
        Account Statement
      </Text>

      {/* Balance */}
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
        {formatMoney(totalOwing, currency)}
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
        {period}
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
        from {orgName}
      </Text>

      {/* CTA */}
      <OutlinedButton href={publicUrl}>View Statement</OutlinedButton>

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
        Please find your account statement for the period {period}. Your current
        outstanding balance is{" "}
        <strong style={{ color: colors.dark }}>
          {formatMoney(totalOwing, currency)}
        </strong>
        . View the full statement for a detailed breakdown of all invoices and
        payments.
      </Text>
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
