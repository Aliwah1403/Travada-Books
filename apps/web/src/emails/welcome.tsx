import React from "react";
import { Text, Link, Section, Row, Column, Hr, Img } from "@react-email/components";
import { EmailLayout, colors } from "./layout";

interface Props {
  firstName: string;
  dashboardUrl: string;
  invoiceUrl: string;
  inviteUrl: string;
}

const font =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const APP_URL = "https://books.travadasys.com";

export default function WelcomeEmail({
  firstName = "Jane",
  dashboardUrl = `${APP_URL}/invoices`,
  invoiceUrl = `${APP_URL}/invoices/create`,
  inviteUrl = `${APP_URL}/settings/members`,
}: Partial<Props>) {
  return (
    <EmailLayout
      preview={`Welcome to Travada Books, ${firstName} — glad you're here.`}
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

      {/* Founder story */}
      <Text
        style={{
          margin: "0 0 16px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.7",
          fontFamily: font,
        }}
      >
        Welcome to Travada Books — I'm Curtis, one of the founders.
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
        We built Travada Books because invoicing and bookkeeping for African
        businesses has always felt like an afterthought — tools built elsewhere,
        for different currencies, different contexts, and different realities.
        Chasing payments, managing clients across WhatsApp threads, and
        piecing together spreadsheets at the end of the month shouldn't be
        part of running a business.
      </Text>
      <Text
        style={{
          margin: "0 0 32px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.7",
          fontFamily: font,
        }}
      >
        Travada Books is built with our customers — and it matters to us that
        you know we're here when you need us. Take your time to explore at
        your own pace. If you ever want to chat, just reply to this email.
        We're always one message away.
      </Text>

      {/* Divider */}
      <Hr style={{ borderColor: colors.border, margin: "0 0 32px" }} />

      {/* Get started heading */}
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
        Get started
      </Text>
      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 18,
          fontWeight: 600,
          color: colors.dark,
          letterSpacing: "-0.01em",
          fontFamily: font,
        }}
      >
        Three things to do first
      </Text>

      {/* Step 1 */}
      <Section
        style={{
          borderTop: `1px solid ${colors.border}`,
          paddingTop: 20,
          paddingBottom: 20,
        }}
      >
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
                margin: "0 0 4px",
                fontSize: 15,
                fontWeight: 600,
                color: colors.dark,
                fontFamily: font,
              }}
            >
              Send your first invoice
            </Text>
            <Text
              style={{
                margin: "0 0 10px",
                fontSize: 13,
                color: colors.muted,
                lineHeight: "1.6",
                fontFamily: font,
              }}
            >
              Create a professional invoice and send it to a customer in under
              a minute.
            </Text>
            <Link
              href={invoiceUrl}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: colors.dark,
                textDecoration: "none",
                fontFamily: font,
              }}
            >
              Create an invoice →
            </Link>
          </Column>
        </Row>
      </Section>

      {/* Step 2 */}
      <Section
        style={{
          borderTop: `1px solid ${colors.border}`,
          paddingTop: 20,
          paddingBottom: 20,
        }}
      >
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
                margin: "0 0 4px",
                fontSize: 15,
                fontWeight: 600,
                color: colors.dark,
                fontFamily: font,
              }}
            >
              Add your team
            </Text>
            <Text
              style={{
                margin: "0 0 10px",
                fontSize: 13,
                color: colors.muted,
                lineHeight: "1.6",
                fontFamily: font,
              }}
            >
              Invite colleagues so everyone has visibility on invoices,
              quotes, and customer accounts.
            </Text>
            <Link
              href={inviteUrl}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: colors.dark,
                textDecoration: "none",
                fontFamily: font,
              }}
            >
              Invite teammates →
            </Link>
          </Column>
        </Row>
      </Section>

      {/* Step 3 */}
      <Section
        style={{
          borderTop: `1px solid ${colors.border}`,
          borderBottom: `1px solid ${colors.border}`,
          paddingTop: 20,
          paddingBottom: 20,
          marginBottom: 32,
        }}
      >
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
                margin: "0 0 4px",
                fontSize: 15,
                fontWeight: 600,
                color: colors.dark,
                fontFamily: font,
              }}
            >
              Explore your dashboard
            </Text>
            <Text
              style={{
                margin: "0 0 10px",
                fontSize: 13,
                color: colors.muted,
                lineHeight: "1.6",
                fontFamily: font,
              }}
            >
              See your invoices, quotes, customers, and statements all in
              one place.
            </Text>
            <Link
              href={dashboardUrl}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: colors.dark,
                textDecoration: "none",
                fontFamily: font,
              }}
            >
              Go to dashboard →
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
        Looking forward to seeing what you build,
      </Text>
      <Text
        style={{
          margin: "0 0 4px",
          fontSize: 14,
          fontWeight: 600,
          color: colors.dark,
          fontFamily: font,
        }}
      >
        Curtis Aliwah
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
