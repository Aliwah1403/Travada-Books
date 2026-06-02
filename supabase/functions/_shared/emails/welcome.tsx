import React from "npm:react"
import { Text } from "../email-components.ts"
import { EmailLayout, CtaButton, colors } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

const APP_URL = "https://books.travadasys.com"

interface Props {
  firstName?: string
}

export function WelcomeEmail({ firstName }: Props) {
  const greeting = firstName ? `Welcome, ${firstName}` : "Welcome to Travada Books"

  return (
    <EmailLayout preview="Your Travada Books account is ready" orgName="Travada Books">
      <Text style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        {greeting}
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        Your account is ready to go
      </Text>

      <Text style={{ margin: "0 0 24px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Thanks for signing up. Travada Books helps you send professional invoices and quotes, track payments, and manage your customers — all in one place.
      </Text>

      <Text style={{ margin: "0 0 32px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        To get started, set up your organization profile and send your first invoice.
      </Text>

      <CtaButton href={`${APP_URL}/invoices`}>Go to Travada Books</CtaButton>

      <Text style={{ margin: "16px 0 0", fontSize: 12, color: colors.faint, textAlign: "center", fontFamily: font }}>
        If you didn't create this account, you can safely ignore this email.
      </Text>
    </EmailLayout>
  )
}
