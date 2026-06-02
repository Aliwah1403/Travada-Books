import React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, OutlinedButton, Hr, colors } from "./layout";

interface Props {
  email: string;
  confirmationUrl: string;
}

export default function AuthConfirmSignupEmail({
  email = "jane@example.com",
  confirmationUrl = "https://books.travadasys.com",
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <EmailLayout
      preview="Verify your email address to activate your Travada Books account."
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
        Verify your email address
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
        {email}
      </Text>

      {/* CTA */}
      <OutlinedButton href={confirmationUrl}>Verify Email Address</OutlinedButton>

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
        Thanks for signing up for Travada Books. Click the button above to verify
        your email address and activate your account.
      </Text>
      <Text
        style={{
          margin: 0,
          fontSize: 13,
          color: colors.muted,
          fontFamily: font,
          lineHeight: "1.6",
        }}
      >
        This link expires in <strong style={{ color: colors.body }}>24 hours</strong>.
        If you did not create an account, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}
