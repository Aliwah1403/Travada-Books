import React from "npm:react"
import {
  Html, Body, Container, Section, Text, Hr, Img, Preview, Link,
} from "./email-components.ts"

export const colors = {
  dark:   "#111827",
  body:   "#374151",
  muted:  "#6B7280",
  faint:  "#9CA3AF",
  border: "#E5E7EB",
}

export { Hr }

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

const APP_URL = "https://books.travadasys.com"
const LOGO_URL = "https://res.cloudinary.com/dzycxaapd/image/upload/v1737289263/Travada%20Assets/j1wpxmua29jwj3dfaw6u.svg"

export function formatMoney(amount: number | null, currency: string) {
  if (amount == null) return ""
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount)
}

export function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

// ── Layout ────────────────────────────────────────────────────────────────────

interface EmailLayoutProps {
  preview: string
  orgName: string
  orgLogoUrl?: string | null
  children: React.ReactNode
}

export function EmailLayout({ preview, orgName, orgLogoUrl, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#ffffff", margin: 0, padding: "48px 16px 0", fontFamily: font }}>
        <Container style={{ maxWidth: 560, margin: "0 auto" }}>

          {/* Logo centered at top */}
          <Section style={{ textAlign: "center", marginBottom: 40 }}>
            {orgLogoUrl
              ? <Img src={orgLogoUrl} height={36} alt={orgName} style={{ display: "inline-block" }} />
              : <Img src={LOGO_URL} height={36} alt="Travada Books" style={{ display: "inline-block" }} />
            }
          </Section>

          {/* Email body */}
          {children}

          {/* Footer */}
          <Section style={{ marginTop: 64, borderTop: `1px solid ${colors.border}`, paddingTop: 40, paddingBottom: 48 }}>
            <table cellPadding={0} cellSpacing={0} style={{ marginBottom: 24 }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "middle", paddingRight: 8 }}>
                    <Img src={LOGO_URL} height={20} alt="Travada Books" style={{ display: "block" }} />
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    <Text style={{ margin: 0, fontSize: 13, fontWeight: 600, color: colors.dark, fontFamily: font }}>
                      Travada Books
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>

            <Text style={{ margin: "0 0 32px", fontSize: 18, fontWeight: 600, color: colors.dark, fontFamily: font }}>
              Smart invoicing for growing businesses.
            </Text>

            <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 32 }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "top", width: "50%" }}>
                    <Text style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 600, color: colors.dark, fontFamily: font }}>Product</Text>
                    <Link href={`${APP_URL}/invoices`} style={{ fontSize: 13, color: colors.muted, textDecoration: "none", display: "block", marginBottom: 10, fontFamily: font }}>Invoices</Link>
                    <Link href={`${APP_URL}/quotes`} style={{ fontSize: 13, color: colors.muted, textDecoration: "none", display: "block", marginBottom: 10, fontFamily: font }}>Quotes</Link>
                    <Link href={`${APP_URL}/customers`} style={{ fontSize: 13, color: colors.muted, textDecoration: "none", display: "block", marginBottom: 10, fontFamily: font }}>Customers</Link>
                    <Link href={`${APP_URL}/statements`} style={{ fontSize: 13, color: colors.muted, textDecoration: "none", display: "block", marginBottom: 10, fontFamily: font }}>Statements</Link>
                  </td>
                  <td style={{ verticalAlign: "top", width: "50%" }}>
                    <Text style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 600, color: colors.dark, fontFamily: font }}>Company</Text>
                    <Link href="https://travadasys.com" style={{ fontSize: 13, color: colors.muted, textDecoration: "none", display: "block", marginBottom: 10, fontFamily: font }}>Website</Link>
                    <Link href={`${APP_URL}/privacy`} style={{ fontSize: 13, color: colors.muted, textDecoration: "none", display: "block", marginBottom: 10, fontFamily: font }}>Privacy policy</Link>
                    <Link href={`${APP_URL}/terms`} style={{ fontSize: 13, color: colors.muted, textDecoration: "none", display: "block", marginBottom: 10, fontFamily: font }}>Terms of service</Link>
                  </td>
                </tr>
              </tbody>
            </table>

            <Text style={{ margin: 0, fontSize: 12, color: colors.faint, fontFamily: font }}>
              Travada Systems · Nairobi, Kenya.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

// ── CTA button ────────────────────────────────────────────────────────────────

export function CtaButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ textAlign: "center", margin: "36px 0" }}>
      <Link
        href={href}
        style={{
          display: "inline-block",
          padding: "10px 20px",
          backgroundColor: "#007a55",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          color: "#e6f7ef",
          textDecoration: "none",
          fontFamily: font,
          letterSpacing: "0.01em",
        }}
      >
        {children}
      </Link>
    </Section>
  )
}
