import React from "react";
import { Text, Link } from "@react-email/components";
import { EmailLayout, OutlinedButton, colors } from "./layout";

interface Props {
  firstName: string;
}

export default function TrialExpiringEmail({
  firstName = "Curtis",
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <EmailLayout
      preview={`${firstName ? `Hi ${firstName}, y` : "Y"}our Travada Books trial ends tomorrow`}
      orgName="Travada Books"
    >
      {/* Heading */}
      <Text
        style={{
          margin: "0 0 8px",
          fontSize: 24,
          fontWeight: 600,
          color: colors.dark,
          letterSpacing: "-0.02em",
          textAlign: "center",
          fontFamily: font,
        }}
      >
        Your trial ends
        <br />
        tomorrow
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
        Subscribe to keep access to all your data
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
        {firstName ? `Hi ${firstName},` : "Hello,"}
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
        Just a heads up — your 14-day free trial ends tomorrow. Subscribe now to
        keep full access to your invoices, quotes, customers, and statements
        without interruption.
      </Text>
      <Text
        style={{
          margin: "0 0 40px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.6",
          fontFamily: font,
        }}
      >
        Have questions before subscribing? Reply to this email — we're happy to
        help.
      </Text>

      {/* CTA */}
      <OutlinedButton href="https://books.travadasys.com/settings/billing">
        Subscribe Now
      </OutlinedButton>

      {/* Fine print */}
      <Text
        style={{
          margin: "40px 0 0",
          fontSize: 13,
          color: colors.muted,
          textAlign: "center",
          lineHeight: "1.6",
          fontFamily: font,
        }}
      >
        If you choose not to subscribe, your account will be locked after your
        trial ends. You can manage your plan anytime from your{" "}
        <Link
          href="https://books.travadasys.com/settings/billing"
          style={{ color: colors.muted, textDecorationLine: "underline" }}
        >
          billing settings
        </Link>
        .
      </Text>
    </EmailLayout>
  );
}
