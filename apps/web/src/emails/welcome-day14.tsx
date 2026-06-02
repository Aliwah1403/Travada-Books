import React from "react";
import { Text, Link } from "@react-email/components";
import { EmailLayout, colors } from "./layout";

interface Props {
  firstName: string;
}

const font =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const APP_URL = "https://books.travadasys.com";

export default function WelcomeDay14Email({
  firstName = "Jane",
}: Partial<Props>) {
  return (
    <EmailLayout
      preview="Two weeks in — how's it going?"
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
        It's been two weeks since you joined Travada Books — wanted to check
        in personally.
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
        How's it going? Are you getting value out of it, or is something
        getting in the way?
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
        I read every reply — seriously. Whether it's a feature you wish we had,
        something that's confusing, or just feedback on the experience so far,
        I want to hear it. We build Travada Books with our users and that only
        works if you tell us what's actually happening on your end.
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
        A few things worth exploring if you haven't already:
      </Text>

      {/* Tips */}
      {[
        {
          title: "Statements",
          desc: "Send a full account statement to a customer showing all their invoices and what's outstanding. Great for long-term clients.",
          href: `${APP_URL}/statements`,
        },
        {
          title: "Invoice reminders",
          desc: "Chasing payments is awkward. Set up automatic reminders and let Travada Books do it for you.",
          href: `${APP_URL}/settings`,
        },
        {
          title: "Customer history",
          desc: "Every customer has a full invoice and quote history. Useful before any client call.",
          href: `${APP_URL}/customers`,
        },
      ].map(({ title, desc, href }) => (
        <Text
          key={title}
          style={{
            margin: "0 0 20px",
            fontSize: 14,
            color: colors.body,
            lineHeight: "1.7",
            fontFamily: font,
          }}
        >
          <strong style={{ color: colors.dark }}>{title}</strong> — {desc}{" "}
          <Link
            href={href}
            style={{ color: colors.muted, textDecoration: "underline" }}
          >
            Take a look →
          </Link>
        </Text>
      ))}

      <Text
        style={{
          margin: "32px 0 16px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.7",
          fontFamily: font,
        }}
      >
        Thanks for being here. Building this in public with people who actually
        use it is what keeps us going.
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
          href="mailto:curtis@travadasys.com"
          style={{ color: colors.muted, textDecoration: "none" }}
        >
          curtis@travadasys.com
        </Link>
      </Text>
    </EmailLayout>
  );
}
