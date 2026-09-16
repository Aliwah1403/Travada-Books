import React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, OutlinedButton, Hr, colors } from "./layout";

interface Props {
  email: string;
  magicLinkUrl: string;
}

export default function AuthMagicLinkEmail({
  email = "jane@example.com",
  magicLinkUrl = "https://books.travadasys.com",
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <EmailLayout
      preview="Your magic link to sign in to Travada Books — expires in 1 hour."
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
        Sign in to Travada Books
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
      <OutlinedButton href={magicLinkUrl}>Sign In</OutlinedButton>

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
        Click the button above to sign in to your Travada Books account. No
        password needed — this link will sign you in automatically.
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
        This link expires in <strong style={{ color: colors.body }}>1 hour</strong>{" "}
        and can only be used once. If you did not request this, you can safely
        ignore this email.
      </Text>
    </EmailLayout>
  );
}
