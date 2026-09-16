import React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, OutlinedButton, colors } from "./layout";

interface Props {
  invitedEmail: string;
  role: string;
  orgName: string;
  settingsUrl: string;
}

export default function TeamMemberInvitedEmail({
  invitedEmail = "jane@example.com",
  role = "Accountant",
  orgName = "Acme Ltd",
  settingsUrl = "https://books.travadasys.com/settings/team",
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <EmailLayout
      preview={`Invitation sent to ${invitedEmail} · ${orgName}`}
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
        Invitation Sent
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
        {invitedEmail} · {role}
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
        An invitation has been sent to{" "}
        <strong style={{ color: colors.dark }}>{invitedEmail}</strong> to join{" "}
        <strong style={{ color: colors.dark }}>{orgName}</strong> as a{" "}
        <strong style={{ color: colors.dark }}>{role}</strong>.
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
        They'll receive an email with a link to accept. Once they accept, they'll
        appear as an active member on your team. You can manage or revoke pending
        invitations from your team settings at any time.
      </Text>

      {/* CTA */}
      <OutlinedButton href={settingsUrl}>Manage team</OutlinedButton>
    </EmailLayout>
  );
}
