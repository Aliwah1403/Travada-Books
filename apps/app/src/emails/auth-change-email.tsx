import React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, OutlinedButton, Hr, colors } from "./layout";

interface Props {
  newEmail: string;
  confirmationUrl: string;
}

export default function AuthChangeEmailEmail({
  newEmail = "jane-new@example.com",
  confirmationUrl = "https://books.travadasys.com",
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <EmailLayout
      preview="Confirm your new email address for Travada Books."
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
        Confirm your new email
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
        {newEmail}
      </Text>

      {/* CTA */}
      <OutlinedButton href={confirmationUrl}>Confirm Email Change</OutlinedButton>

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
        We received a request to change the email address on your Travada Books
        account. Click the button above to confirm{" "}
        <strong style={{ color: colors.dark }}>{newEmail}</strong> as your new
        email address.
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
        If you did not request this change, please contact{" "}
        <strong style={{ color: colors.body }}>support@travadasys.com</strong>{" "}
        immediately.
      </Text>
    </EmailLayout>
  );
}
