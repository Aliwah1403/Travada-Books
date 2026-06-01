import React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, OutlinedButton, colors } from "./layout";

interface Props {
  memberName: string;
  memberEmail: string;
  role: string;
  orgName: string;
  settingsUrl: string;
}

export default function TeamMemberJoinedEmail({
  memberName = "Jane Mwangi",
  memberEmail = "jane@example.com",
  role = "Accountant",
  orgName = "Acme Ltd",
  settingsUrl = "https://books.travadasys.com/settings/team",
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <EmailLayout
      preview={`${memberName} joined ${orgName} on Travada Books`}
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
        New team member
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
        {memberName} · {role}
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
        <strong style={{ color: colors.dark }}>{memberName}</strong> (
        {memberEmail}) has accepted your invitation and joined{" "}
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
        They now have access to your account. You can update their role or remove
        them from your team settings at any time.
      </Text>

      {/* CTA */}
      <OutlinedButton href={settingsUrl}>View team</OutlinedButton>
    </EmailLayout>
  );
}
