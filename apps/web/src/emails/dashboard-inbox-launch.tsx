import React from "react";
import { Text, Section, Hr, Link } from "@react-email/components";
import { EmailLayout, OutlinedButton, colors } from "./layout";

interface Props {
  firstName: string;
  dashboardUrl: string;
  inboxUrl: string;
  unsubscribeUrl: string;
}

const font =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const APP_URL = "https://books.travadasys.com";

const paragraphStyle = {
  margin: "0 0 16px",
  fontSize: 14,
  color: colors.body,
  lineHeight: "1.7",
  fontFamily: font,
};

export default function DashboardInboxLaunchEmail({
  firstName = "Jane",
  dashboardUrl = `${APP_URL}/`,
  inboxUrl = `${APP_URL}/inbox`,
  unsubscribeUrl = "https://books.travadasys.com/unsubscribe",
}: Partial<Props>) {
  return (
    <EmailLayout
      preview="Dashboard and Inbox are live — the last stop before we leave beta"
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
        Dashboard and Inbox are live
      </Text>
      <Text
        style={{
          margin: "0 0 40px",
          fontSize: 13,
          color: colors.muted,
          textAlign: "center",
          fontFamily: font,
        }}
      >
        The last two features on our beta list
      </Text>

      {/* Intro */}
      <Text style={paragraphStyle}>Hi {firstName},</Text>
      <Text style={{ ...paragraphStyle, margin: "0 0 40px" }}>
        Big one today: Dashboard and Inbox are both live in your account.
        These were the last two features on our beta roadmap — everything
        from here is about polish and stability as we get ready to open
        Travada Books up beyond beta.
      </Text>

      {/* Dashboard */}
      <Text
        style={{
          margin: "0 0 8px",
          fontSize: 18,
          fontWeight: 600,
          color: colors.dark,
          letterSpacing: "-0.01em",
          fontFamily: font,
        }}
      >
        Dashboard
      </Text>
      <Text style={{ ...paragraphStyle, margin: "0 0 24px" }}>
        A real picture of the business the moment you log in — cash flow,
        burn rate, cash cushion, overdue and outstanding invoices, top
        customers, profit &amp; loss, and more. Pick the widgets that matter
        to you and drag them into place; the layout is saved per person, so
        everyone on the team sees what's relevant to them. Filter any of it
        by date range, and switch between gross and net revenue whenever you
        need to.
      </Text>

      <Section style={{ textAlign: "center", margin: "0 0 48px" }}>
        <OutlinedButton href={dashboardUrl}>Open Dashboard</OutlinedButton>
      </Section>

      <Hr style={{ borderColor: colors.border, margin: "0 0 40px" }} />

      {/* Inbox */}
      <Text
        style={{
          margin: "0 0 8px",
          fontSize: 18,
          fontWeight: 600,
          color: colors.dark,
          letterSpacing: "-0.01em",
          fontFamily: font,
        }}
      >
        Inbox
      </Text>
      <Text style={{ ...paragraphStyle, margin: "0 0 24px" }}>
        Every org now has its own forwarding email address — send a receipt
        or invoice there (or drop it straight into the Inbox) and Travada
        Books reads it, pulls out the amount, date, merchant, and tax, and
        suggests a match to the right transaction. Confirm the match and it
        automatically files itself into Vault. No more digging through your
        personal inbox at tax time.
      </Text>

      <Section style={{ textAlign: "center", margin: "0 0 48px" }}>
        <OutlinedButton href={inboxUrl}>Open Inbox</OutlinedButton>
      </Section>

      <Hr style={{ borderColor: colors.border, margin: "0 0 40px" }} />

      {/* What's next */}
      <Text style={paragraphStyle}>
        Direct Gmail and Outlook sync — so receipts land in your Inbox
        without forwarding anything — is next on the list, but it's a
        post-beta feature. For now, the forwarding address gets you most of
        the way there in a few seconds of setup.
      </Text>

      <Text style={{ ...paragraphStyle, margin: "32px 0 24px" }}>
        Thank you for building this with us through beta. If Dashboard or
        Inbox feel off in any way, or there's something you wish they did,
        just reply — I read every message myself.
      </Text>

      {/* Sign-off */}
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

      <Text
        style={{
          margin: "40px 0 0",
          fontSize: 12,
          color: colors.faint,
          fontFamily: font,
        }}
      >
        Don't want product update emails?{" "}
        <Link
          href={unsubscribeUrl}
          style={{ color: colors.faint, textDecoration: "underline" }}
        >
          Unsubscribe
        </Link>
      </Text>
    </EmailLayout>
  );
}
