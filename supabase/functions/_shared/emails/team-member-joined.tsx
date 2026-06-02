import React from "npm:react"
import { Text } from "../email-components.ts"
import { EmailLayout, CtaButton, colors } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  memberName: string
  memberEmail: string
  role: string
  orgName: string
  settingsUrl: string
}

export function TeamMemberJoinedEmail({ memberName, memberEmail, role, orgName, settingsUrl }: Props) {
  return (
    <EmailLayout
      preview={`${memberName} joined ${orgName} on Travada Books`}
      orgName="Travada Books"
    >
      <Text style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        New team member
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        {memberName} · {role}
      </Text>

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        <strong style={{ color: colors.dark }}>{memberName}</strong> ({memberEmail}) has accepted your invitation and joined <strong style={{ color: colors.dark }}>{orgName}</strong> as a <strong style={{ color: colors.dark }}>{role}</strong>.
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        They now have access to your account. You can update their role or remove them from your team settings at any time.
      </Text>

      <CtaButton href={settingsUrl}>View team</CtaButton>
    </EmailLayout>
  )
}
