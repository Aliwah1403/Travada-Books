import React from "react";
import { Text, Section } from "@react-email/components";
import { EmailLayout, Hr, colors } from "./layout";

interface Props {
  email: string;
  code: string;
}

export default function AuthConfirmSignupEmail({
  email = "jane@example.com",
  code = "48291073",
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <EmailLayout
      preview="Your Travada Books confirmation code is inside."
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
        Confirm your account
      </Text>

      {/* Meta */}
      <Text
        style={{
          margin: "0 0 32px",
          fontSize: 13,
          color: colors.muted,
          textAlign: "center",
          fontFamily: font,
        }}
      >
        {email}
      </Text>

      {/* OTP code */}
      <Section
        style={{
          textAlign: "center",
          margin: "0 0 32px",
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: colors.dark,
            fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace",
          }}
        >
          {code}
        </Text>
      </Section>

      {/* Divider */}
      <Hr style={{ borderColor: colors.border, margin: "0 0 32px" }} />

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
        Enter the code above on the verification page to activate your Travada Books account.
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
        If you did not create an account, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}
