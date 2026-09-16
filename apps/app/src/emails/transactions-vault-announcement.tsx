import React from "react";
import { Text, Link } from "@react-email/components";
import { EmailLayout, colors, OutlinedButton } from "./layout";

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const APP_URL = "https://books.travadasys.com";

interface Props {
  firstName: string;
  unsubscribeUrl: string;
}

const paragraphStyle = {
  margin: "0 0 16px",
  fontSize: 14,
  color: colors.body,
  lineHeight: "1.7",
  fontFamily: font,
};

export default function TransactionsVaultAnnouncementEmail({
  firstName = "Jane",
  unsubscribeUrl = "https://books.travadasys.com/unsubscribe",
}: Partial<Props>) {
  return (
    <EmailLayout
      preview="Two features already sitting in your account"
      orgName="Travada Books"
    >
      <Text style={paragraphStyle}>Hi {firstName},</Text>

      <Text style={paragraphStyle}>
        You've been using Travada Books for invoicing — but there are two
        features already in your account that most people miss. Both take
        less than a minute to try.
      </Text>

      {[
        {
          title: "Transactions",
          desc: "Import your bank statement as a CSV or PDF and Travada Books categorizes every transaction automatically, so you can see income, expenses, and totals at a glance — no spreadsheets.",
          href: `${APP_URL}/transactions`,
        },
        {
          title: "Vault",
          desc: "Secure storage for every company document — contracts, receipts, licenses, statements, and more. Upload a file and Vault sorts and labels it for you — share any document with a secure link, no login required for the recipient.",
          href: `${APP_URL}/vault`,
        },
      ].map(({ title, desc, href }) => (
        <Text key={title} style={{ ...paragraphStyle, margin: "0 0 20px" }}>
          <strong style={{ color: colors.dark }}>{title}</strong> — {desc}{" "}
          <Link href={href} style={{ color: colors.muted, textDecoration: "underline" }}>
            Take a look →
          </Link>
        </Text>
      ))}

      <OutlinedButton href={`${APP_URL}/transactions`}>
        Try it now
      </OutlinedButton>

      <Text style={{ ...paragraphStyle, margin: "8px 0 4px" }}>
        Questions or feedback? Just reply — I read every message.
      </Text>

      <Text style={{ margin: "0 0 4px", fontSize: 14, color: colors.body, lineHeight: "1.7", fontFamily: font }}>
        — Curtis
      </Text>
      <Text style={{ margin: 0, fontSize: 13, color: colors.muted, fontFamily: font }}>
        Co-founder, Travada Books
        <br />
        <Link href="mailto:curtis.aliwah@travadasys.com" style={{ color: colors.muted, textDecoration: "none" }}>
          curtis.aliwah@travadasys.com
        </Link>
      </Text>

      <Text style={{ margin: "40px 0 0", fontSize: 12, color: colors.faint, fontFamily: font }}>
        Don't want product update emails?{" "}
        <Link href={unsubscribeUrl} style={{ color: colors.faint, textDecoration: "underline" }}>
          Unsubscribe
        </Link>
      </Text>
    </EmailLayout>
  );
}
