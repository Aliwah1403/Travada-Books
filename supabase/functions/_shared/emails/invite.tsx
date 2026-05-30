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

      <Text style={{ margin: "0 0 32px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        <strong style={{ color: colors.dark }}>{inviterName}</strong> has invited you to collaborate on <strong style={{ color: colors.dark }}>{orgName}</strong>'s account on Travada Books — invoicing and bookkeeping for your business.
      </Text>

      {/* Steps */}
      <Section style={{ margin: "0 0 32px", backgroundColor: "#F9FAFB", borderRadius: 8, padding: "20px 24px" }}>
        <Text style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 600, color: colors.muted, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: font }}>
          How to join
        </Text>

        {[
          { n: "1", title: "Accept the invitation", body: "Click the button below to open your invite." },
          { n: "2", title: "Sign in or create a free account", body: `Use the email address this invite was sent to: ${invitedEmail}` },
          { n: "3", title: "You're in", body: `You'll be added to ${orgName}'s workspace automatically.` },
        ].map(({ n, title, body }) => (
          <table key={n} cellPadding={0} cellSpacing={0} style={{ marginBottom: 14, width: "100%" }}>
            <tbody>
              <tr>
                <td style={{ verticalAlign: "top", paddingRight: 12, width: 28 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "#007a55", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#e6f7ef", textAlign: "center", fontFamily: font, lineHeight: "24px" }}>
                      {n}
                    </Text>
                  </div>
                </td>
                <td style={{ verticalAlign: "top" }}>
                  <Text style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: colors.dark, fontFamily: font }}>{title}</Text>
                  <Text style={{ margin: 0, fontSize: 13, color: colors.muted, fontFamily: font }}>{body}</Text>
                </td>
              </tr>
            </tbody>
          </table>
        ))}
      </Section>

      <CtaButton href={acceptUrl}>Accept Invitation</CtaButton>

      <Text style={{ margin: "16px 0 0", fontSize: 12, color: colors.faint, textAlign: "center", fontFamily: font }}>
        This invite expires in 7 days. If you didn't expect this email, you can safely ignore it.
      </Text>
    </EmailLayout>
  )
}
