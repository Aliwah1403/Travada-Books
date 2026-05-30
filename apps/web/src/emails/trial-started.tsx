import React from "react";
import { Text, Section } from "@react-email/components";
import { EmailLayout, OutlinedButton, colors } from "./layout";

interface Props {
  firstName: string;
}

export default function TrialStartedEmail({
  firstName = "Curtis",
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <EmailLayout
      preview="Your 14-day free trial has started — no credit card required"
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
        Your 14-day free trial
        <br />
        has started
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
        No credit card required
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
        Hi {firstName},
      </Text>
      <Text
        style={{
          margin: "0 0 16px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.6",
          fontFamily: font,
        }}
      >
        Welcome to Travada Books. Your free trial gives you full access to
        everything for the next 14 days — no limits, no credit card.
      </Text>

      {/* Feature highlights */}
      <Section
        style={{
          backgroundColor: "#F9FAFB",
          borderRadius: 6,
          padding: "16px 20px",
          marginBottom: 24,
        }}
      >
        {[
          "Create and send professional invoices",
          "Send quotes and convert them to invoices",
          "Manage your customers in one place",
          "Share account statements with clients",
        ].map((item) => (
          <Text
            key={item}
            style={{
              margin: "0 0 10px",
              fontSize: 13,
              color: colors.body,
              lineHeight: "1.5",
              fontFamily: font,
            }}
          >
            <span style={{ color: "#007a55", marginRight: 8, fontWeight: 600 }}>
              ✓
            </span>
            {item}
          </Text>
        ))}
      </Section>

      <Text
        style={{
          margin: "0 0 40px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.6",
          fontFamily: font,
        }}
      >
        If you have any questions or need help getting set up, just reply to
        this email.
      </Text>

      {/* CTA */}
      <OutlinedButton href="https://books.travadasys.com">
        Start Invoicing
      </OutlinedButton>
    </EmailLayout>
  );
}
