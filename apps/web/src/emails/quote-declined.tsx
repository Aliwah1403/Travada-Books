import React from "react";
import { Section, Text } from "@react-email/components";
import { EmailLayout, OutlinedButton, formatMoney, colors } from "./layout";

interface Props {
  orgName: string;
  quoteNumber: string | null;
  customerName: string;
  total: number | null;
  currency: string;
  declineReason?: string | null;
  viewUrl: string;
}

export default function QuoteDeclinedEmail({
  orgName = "Acme Ltd",
  quoteNumber = "QT-0005",
  customerName = "John Doe",
  total = 120000,
  currency = "KES",
  declineReason = "The budget was revised and we're unable to proceed at this time.",
  viewUrl = "https://books.travadasys.com/quotes/demo",
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const label = quoteNumber ? `Quote ${quoteNumber}` : "A quote";

  return (
    <EmailLayout
      preview={`${customerName} declined ${label}`}
      orgName="Travada Books"
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
        Quote Declined
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
          margin: "0 0 40px",
          fontSize: 13,
          color: colors.muted,
          textAlign: "center",
          fontFamily: font,
        }}
      >
        {customerName} · {label}
      </Text>

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
        {customerName} has declined {label}
        {total != null ? ` (${formatMoney(total, currency)})` : ""}. You can
        edit the quote and resend it from your {orgName} account if you'd like
        to follow up.
      </Text>

      {/* Decline reason */}
      {declineReason && (
        <Section
          style={{
            backgroundColor: "#F9FAFB",
            borderRadius: 4,
            padding: "14px 18px",
            marginBottom: 40,
          }}
        >
          <Text
            style={{
              margin: "0 0 4px",
              fontSize: 11,
              fontWeight: 600,
              color: colors.muted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontFamily: font,
            }}
          >
            Reason given
          </Text>
          <Text
            style={{
              margin: 0,
              fontSize: 13,
              color: colors.body,
              lineHeight: "1.5",
              fontFamily: font,
            }}
          >
            {declineReason}
          </Text>
        </Section>
      )}

      {/* CTA */}
      <OutlinedButton href={viewUrl}>View Quote</OutlinedButton>
    </EmailLayout>
  );
}
