import React from "react"
import { Text, Section, Img, Link, Row, Column } from "@react-email/components"
import { EmailLayout, OutlinedButton, colors } from "../layout"

// Onboarding emails are uploaded to Resend as templates and sent by a Resend
// automation, so personalisation uses Resend's contact placeholders instead of props.
// The API rejects the `|fallback` form; signup always collects a name, so none is needed.
export const FIRST_NAME = "{{{FIRST_NAME}}}"
export const UNSUBSCRIBE_URL = "{{{RESEND_UNSUBSCRIBE_URL}}}"

export const APP_URL = "https://app.travadabooks.com"
// PNG copies of the website screenshots live in apps/website/public/email —
// Outlook desktop can't render the .webp originals.
export const IMG_URL = "https://travadabooks.com/email"
const SIGNATURE_URL = `${IMG_URL}/signature-curtis.png`

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

export function OnboardingEmail({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <EmailLayout preview={preview} orgName="Travada Books">
      {children}
      <Text style={{ margin: "40px 0 0", fontSize: 12, color: colors.faint, fontFamily: font }}>
        You're getting this because you signed up for Travada Books. Don't want these
        getting-started emails?{" "}
        <Link href={UNSUBSCRIBE_URL} style={{ color: colors.faint, textDecoration: "underline" }}>
          Unsubscribe
        </Link>
      </Text>
    </EmailLayout>
  )
}

export function P({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return (
    <Text
      style={{
        margin: "0 0 16px",
        fontSize: 14,
        lineHeight: "1.7",
        color: bold ? colors.dark : colors.body,
        fontWeight: bold ? 600 : 400,
        fontFamily: font,
      }}
    >
      {children}
    </Text>
  )
}

export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "32px 0 12px",
        fontSize: 17,
        fontWeight: 600,
        color: colors.dark,
        letterSpacing: "-0.01em",
        fontFamily: font,
      }}
    >
      {children}
    </Text>
  )
}

export function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ color: colors.dark, textDecoration: "underline", fontFamily: font }}>
      {children}
    </Link>
  )
}

/** A real, cropped product screenshot. `pending` renders a labelled box until the shot exists. */
export function Screenshot({ src, alt, pending }: { src?: string; alt: string; pending?: boolean }) {
  if (pending || !src) {
    return (
      <Section
        style={{
          margin: "8px 0 24px",
          padding: "48px 24px",
          border: `1px dashed ${colors.faint}`,
          borderRadius: 8,
          textAlign: "center",
        }}
      >
        <Text style={{ margin: 0, fontSize: 12, color: colors.muted, fontFamily: font }}>
          Screenshot to capture: {alt}
        </Text>
      </Section>
    )
  }
  return (
    <Section style={{ margin: "8px 0 24px" }}>
      <Img
        src={src}
        alt={alt}
        width="100%"
        style={{
          display: "block",
          width: "100%",
          maxWidth: 560,
          height: "auto",
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
        }}
      />
    </Section>
  )
}

export function Steps({ items }: { items: { title: string; body: string }[] }) {
  return (
    <Section style={{ margin: "4px 0 24px" }}>
      {items.map((item, i) => (
        <Row key={item.title} style={{ marginBottom: 14 }}>
          <Column style={{ width: 28, verticalAlign: "top", paddingTop: 1 }}>
            <Text style={{ margin: 0, fontSize: 13, fontWeight: 600, color: colors.faint, fontFamily: font }}>
              {String(i + 1).padStart(2, "0")}
            </Text>
          </Column>
          <Column style={{ verticalAlign: "top" }}>
            <Text style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: colors.dark, fontFamily: font }}>
              {item.title}
            </Text>
            <Text style={{ margin: 0, fontSize: 13, lineHeight: "1.6", color: colors.muted, fontFamily: font }}>
              {item.body}
            </Text>
          </Column>
        </Row>
      ))}
    </Section>
  )
}

export function Cta({ href, children }: { href: string; children: React.ReactNode }) {
  return <OutlinedButton href={href}>{children}</OutlinedButton>
}

/** "Next time" line — the hook into the following email. */
export function Next({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "32px 0 24px",
        paddingTop: 20,
        borderTop: `1px solid ${colors.border}`,
        fontSize: 13,
        lineHeight: "1.6",
        color: colors.muted,
        fontFamily: font,
      }}
    >
      {children}
    </Text>
  )
}

export function SignOff({ signature }: { signature?: boolean }) {
  return (
    <Section>
      <Text style={{ margin: "0 0 4px", fontSize: 14, color: colors.body, lineHeight: "1.7", fontFamily: font }}>
        Speak soon,
      </Text>
      {signature && (
        <Img src={SIGNATURE_URL} alt="" height={44} style={{ display: "block", margin: "4px 0 6px" }} />
      )}
      <Text style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: colors.dark, fontFamily: font }}>
        Curtis Aliwah
      </Text>
      <Text style={{ margin: 0, fontSize: 13, color: colors.muted, fontFamily: font }}>
        Co-founder, Travada Books · reply any time, it comes straight to me
      </Text>
    </Section>
  )
}
