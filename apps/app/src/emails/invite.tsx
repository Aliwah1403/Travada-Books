import React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, OutlinedButton, colors } from "./layout";

interface Props {
  invitedEmail: string;
  inviterName: string;
  orgName: string;
  acceptUrl: string;
}

export default function InviteEmail({
  invitedEmail = "jane@example.com",
  inviterName = "Curtis Aliwah",
  orgName = "Acme Ltd",
  acceptUrl = "https://books.travadasys.com/onboarding/invite",
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <EmailLayout
      preview={`${inviterName} invited you to join ${orgName} on Travada Books`}
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
        You've been invited
        <br />
        to join {orgName}
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
        Invited by {inviterName}
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
        <strong style={{ color: colors.dark }}>{inviterName}</strong> has
        invited you to collaborate on{" "}
        <strong style={{ color: colors.dark }}>{orgName}</strong>'s account on
        Travada Books.
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
        Accept the invitation below to get started. This invite was sent to{" "}
        <strong style={{ color: colors.dark }}>{invitedEmail}</strong>.
      </Text>

      {/* CTA */}
      <OutlinedButton href={acceptUrl}>Accept Invitation</OutlinedButton>
    </EmailLayout>
  );
}
