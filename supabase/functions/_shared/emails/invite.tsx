import React from "npm:react"
import { Text } from "../email-components.ts"
import { EmailLayout, CtaButton, colors } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  invitedEmail: string
  inviterName: string
  orgName: string
  acceptUrl: string
}

export function InviteEmail({ invitedEmail, inviterName, orgName, acceptUrl }: Props) {
  return (
    <EmailLayout
      preview={`${inviterName} invited you to join ${orgName} on Travada Books`}
      orgName="Travada Books"
    >
      <Text style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        You've been invited<br />to join {orgName}
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        Invited by {inviterName}
      </Text>

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        <strong style={{ color: colors.dark }}>{inviterName}</strong> has invited you to collaborate on <strong style={{ color: colors.dark }}>{orgName}</strong>'s account on Travada Books.
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Accept the invitation below to get started. This invite was sent to <strong style={{ color: colors.dark }}>{invitedEmail}</strong>.
      </Text>

      <CtaButton href={acceptUrl}>Accept Invitation</CtaButton>
    </EmailLayout>
  )
}
