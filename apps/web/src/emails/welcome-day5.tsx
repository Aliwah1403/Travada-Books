import React from "react";
import { Text, Link, Hr } from "@react-email/components";
import { EmailLayout, OutlinedButton, colors } from "./layout";

interface Props {
  firstName: string;
  invoiceUrl: string;
}

const font =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const APP_URL = "https://books.travadasys.com";

export default function WelcomeDay5Email({
  firstName = "Jane",
  invoiceUrl = `${APP_URL}/invoices/create`,
}: Partial<Props>) {
  return (
    <EmailLayout
      preview="Have you sent your first invoice yet? It takes less than a minute."
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
        Quick check-in — have you sent your first invoice yet?
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
        If not, no pressure — but I want to share something we hear a lot from
        new users. Most people expect it to take a while, so they put it off.
        Then they actually do it and realise it took under a minute.
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
        Add your customer, fill in what they owe, hit send. That's genuinely it.
      </Text>

      <OutlinedButton href={invoiceUrl}>Send your first invoice</OutlinedButton>

      <Hr style={{ borderColor: colors.border, margin: "40px 0 32px" }} />

      {/* Common hesitations */}
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
        Common questions
      </Text>

      <Text
        style={{
          margin: "20px 0 6px",
          fontSize: 14,
          fontWeight: 600,
          color: colors.dark,
          fontFamily: font,
        }}
      >
        Do my customers need to sign up?
      </Text>
      <Text
        style={{
          margin: "0 0 20px",
          fontSize: 13,
          color: colors.muted,
          lineHeight: "1.6",
          fontFamily: font,
        }}
      >
        No. They receive an email with a link to view the invoice in their
        browser. No account, no login, no friction on their end.
      </Text>

      <Text
        style={{
          margin: "0 0 6px",
          fontSize: 14,
          fontWeight: 600,
          color: colors.dark,
          fontFamily: font,
        }}
      >
        What currency can I invoice in?
      </Text>
      <Text
        style={{
          margin: "0 0 20px",
          fontSize: 13,
          color: colors.muted,
          lineHeight: "1.6",
          fontFamily: font,
        }}
      >
        Any currency. KES, USD, GBP, EUR — whatever your customer's deal is.
        You set the currency per invoice.
      </Text>

      <Text
        style={{
          margin: "0 0 6px",
          fontSize: 14,
          fontWeight: 600,
          color: colors.dark,
          fontFamily: font,
        }}
      >
        Can I customise how it looks?
      </Text>
      <Text
        style={{
          margin: "0 0 32px",
          fontSize: 13,
          color: colors.muted,
          lineHeight: "1.6",
          fontFamily: font,
        }}
      >
        Yes — add your logo, set your payment terms, and configure your default
        invoice settings under{" "}
        <Link
          href={`${APP_URL}/settings`}
          style={{ color: colors.muted, textDecoration: "underline" }}
        >
          Settings
        </Link>
        .
      </Text>

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
        As always, if anything's blocking you — just reply.
      </Text>
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
