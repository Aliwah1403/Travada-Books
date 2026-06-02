import React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, Hr, colors } from "./layout";

interface Props {
  email: string;
  otp: string;
}

export default function AuthResetPasswordEmail({
  email = "jane@example.com",
  otp = "123456",
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <EmailLayout
      preview="Your password reset code for Travada Books."
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
        Reset your password
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

      {/* OTP Code */}
      <Text
        style={{
          margin: "0 0 8px",
          fontSize: 13,
          color: colors.muted,
          textAlign: "center",
          fontFamily: font,
        }}
      >
        Your reset code
      </Text>
      <Text
        style={{
          margin: "0 0 40px",
          fontSize: 40,
          fontWeight: 700,
          color: colors.dark,
          textAlign: "center",
          letterSpacing: "0.25em",
          fontFamily: font,
        }}
      >
        {otp}
      </Text>

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
        We received a request to reset the password for your Travada Books account.
        Enter the code above on the reset page to choose a new password.
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
        This code expires in <strong style={{ color: colors.body }}>1 hour</strong>.
        If you did not request a password reset, your account is safe — you can
        ignore this email.
      </Text>
    </EmailLayout>
  );
}
