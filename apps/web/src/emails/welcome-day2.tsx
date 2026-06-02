import React from "react";
import { Text, Link, Section, Row, Column, Hr } from "@react-email/components";
import { EmailLayout, OutlinedButton, colors } from "./layout";

interface Props {
  firstName: string;
  invoiceUrl: string;
  quoteUrl: string;
}

const font =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const APP_URL = "https://books.travadasys.com";

export default function WelcomeDay2Email({
  firstName = "Jane",
  invoiceUrl = `${APP_URL}/invoices/create`,
  quoteUrl = `${APP_URL}/quotes/create`,
}: Partial<Props>) {
  return (
    <EmailLayout
      preview="How getting paid works on Travada Books — the full picture in 2 minutes."
      orgName="Travada Books"
    >
      {/* Greeting */}
      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.7",
          fontFamily: font,
        }}
      >
        Hi {firstName},
      </Text>

      <Text
        style={{
          margin: "0 0 16px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.7",
          fontFamily: font,
        }}
      >
        Before you send your first invoice, it helps to understand how the
        whole flow works — from the moment you win a client to the moment
        money hits your account.
      </Text>

      <Hr style={{ borderColor: colors.border, margin: "32px 0" }} />

      {/* Flow heading */}
      <Text
        style={{
          margin: "0 0 4px",
          fontSize: 11,
          fontWeight: 600,
          color: colors.muted,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontFamily: font,
        }}
      >
        The flow
      </Text>
      <Text
        style={{
          margin: "0 0 28px",
          fontSize: 18,
          fontWeight: 600,
          color: colors.dark,
          letterSpacing: "-0.01em",
          fontFamily: font,
        }}
      >
        Quote → Invoice → Paid
      </Text>

      {/* Step 1 */}
      <Section style={{ marginBottom: 24 }}>
        <Row>
          <Column style={{ width: 28, verticalAlign: "top", paddingTop: 2 }}>
            <Text
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: colors.faint,
                fontFamily: font,
              }}
            >
              01
            </Text>
          </Column>
          <Column style={{ verticalAlign: "top" }}>
            <Text
              style={{
                margin: "0 0 6px",
                fontSize: 15,
                fontWeight: 600,
                color: colors.dark,
                fontFamily: font,
              }}
            >
              Start with a quote (optional but powerful)
            </Text>
            <Text
              style={{
                margin: 0,
                fontSize: 13,
                color: colors.muted,
                lineHeight: "1.6",
                fontFamily: font,
              }}
            >
              Send a quote first so your customer knows exactly what they're
              agreeing to. Once they accept, Travada Books converts it into an
              invoice automatically — no re-entering anything.
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Step 2 */}
      <Section style={{ marginBottom: 24 }}>
        <Row>
          <Column style={{ width: 28, verticalAlign: "top", paddingTop: 2 }}>
            <Text
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: colors.faint,
                fontFamily: font,
              }}
            >
              02
            </Text>
          </Column>
          <Column style={{ verticalAlign: "top" }}>
            <Text
              style={{
                margin: "0 0 6px",
                fontSize: 15,
                fontWeight: 600,
                color: colors.dark,
                fontFamily: font,
              }}
            >
              Send the invoice
            </Text>
            <Text
              style={{
                margin: 0,
                fontSize: 13,
                color: colors.muted,
                lineHeight: "1.6",
                fontFamily: font,
              }}
            >
              Your customer gets a clean email with a link to view the invoice
              online. They can see the full breakdown, due date, and your
              payment details — no login required on their end.
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Step 3 */}
      <Section style={{ marginBottom: 32 }}>
        <Row>
          <Column style={{ width: 28, verticalAlign: "top", paddingTop: 2 }}>
            <Text
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: colors.faint,
                fontFamily: font,
              }}
            >
              03
            </Text>
          </Column>
          <Column style={{ verticalAlign: "top" }}>
            <Text
              style={{
                margin: "0 0 6px",
                fontSize: 15,
                fontWeight: 600,
                color: colors.dark,
                fontFamily: font,
              }}
            >
              Mark it paid
            </Text>
            <Text
              style={{
                margin: 0,
                fontSize: 13,
                color: colors.muted,
                lineHeight: "1.6",
                fontFamily: font,
              }}
            >
              Once payment comes in, mark the invoice paid. Your records
              update instantly and your customer gets a receipt. Simple,
              clean, done.
            </Text>
          </Column>
        </Row>
      </Section>

      <Hr style={{ borderColor: colors.border, margin: "0 0 32px" }} />

      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.7",
          fontFamily: font,
        }}
      >
        Ready to try it? Start with whichever fits — a quote if you're
        still in discussions, or go straight to an invoice if it's already
        agreed.
      </Text>

      {/* CTAs side by side */}
      <Section style={{ marginBottom: 40 }}>
        <Row>
          <Column style={{ paddingRight: 12 }}>
            <OutlinedButton href={invoiceUrl}>Create Invoice</OutlinedButton>
          </Column>
          <Column>
            <Link
              href={quoteUrl}
              style={{
                display: "inline-block",
                padding: "10px 20px",
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                color: colors.dark,
                textDecoration: "none",
                fontFamily: font,
              }}
            >
              Create Quote
            </Link>
          </Column>
        </Row>
      </Section>

      {/* Sign-off */}
      <Text
        style={{
          margin: "0 0 4px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.7",
          fontFamily: font,
        }}
      >
        — Curtis
      </Text>
      <Text
        style={{
          margin: 0,
          fontSize: 13,
          color: colors.muted,
          fontFamily: font,
        }}
      >
        Co-founder, Travada Books
      </Text>
    </EmailLayout>
  );
}
