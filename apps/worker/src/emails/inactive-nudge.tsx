import React from "react";
import { Text, Link } from "@react-email/components";
import { EmailLayout, OutlinedButton, colors } from "./layout";

interface Props {
  firstName: string;
  unsubscribeUrl: string;
}

const font =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const APP_URL = "https://books.travadasys.com";

export default function InactiveNudgeEmail({
  firstName = "Jane",
  unsubscribeUrl = "https://books.travadasys.com/unsubscribe",
}: Partial<Props>) {
  return (
    <EmailLayout
      preview="Still there? Your Travada Books account is ready when you are"
      orgName="Travada Books"
    >
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
        I noticed you haven't had a chance to use Travada Books since you
        signed up — no worries, life gets busy. I just wanted to check in and
        see if there's anything holding you back.
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
        If something wasn't clear, a feature was missing, or you're just not
        sure where to start, reply to this email and let me know. I read every
        message myself.
      </Text>

      <Text
        style={{
          margin: "0 0 20px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.7",
          fontFamily: font,
        }}
      >
        Here's the fastest way back in:
      </Text>

      {[
        {
          title: "Send your first invoice",
          desc: "Add a customer, list what you're billing for, and send a professional invoice in under two minutes.",
        },
        {
          title: "Import your transactions",
          desc: "Upload a bank statement and see your income and expenses categorized automatically.",
        },
        {
          title: "Set up your business profile",
          desc: "Add your logo and details once so every invoice and quote looks polished from the start.",
        },
      ].map(({ title, desc }) => (
        <Text
          key={title}
          style={{
            margin: "0 0 16px",
            fontSize: 14,
            color: colors.body,
            lineHeight: "1.7",
            fontFamily: font,
          }}
        >
          <strong style={{ color: colors.dark }}>{title}</strong> — {desc}
        </Text>
      ))}

      <OutlinedButton href={APP_URL}>Go to Travada Books</OutlinedButton>

      <Text
        style={{
          margin: "8px 0 4px",
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
        <br />
        <Link
          href="mailto:curtis.aliwah@travadasys.com"
          style={{ color: colors.muted, textDecoration: "none" }}
        >
          curtis.aliwah@travadasys.com
        </Link>
      </Text>

      <Text
        style={{ margin: "40px 0 0", fontSize: 12, color: colors.faint, fontFamily: font }}
      >
        Don't want these onboarding emails?{" "}
        <Link href={unsubscribeUrl} style={{ color: colors.faint, textDecoration: "underline" }}>
          Unsubscribe
        </Link>
      </Text>
    </EmailLayout>
  );
}
