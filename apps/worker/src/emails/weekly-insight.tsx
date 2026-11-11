import React from "react";
import { Text, Link } from "@react-email/components";
import { EmailLayout, OutlinedButton, colors } from "./layout";

export interface WeeklyInsightFigure {
  label: string;
  value: string;
  change: string | null;
}

export interface WeeklyInsightAction {
  text: string;
  url: string;
}

interface Props {
  firstName?: string | null;
  orgName: string;
  orgLogoUrl?: string | null;
  title: string;
  periodLabel: string;
  summary: string;
  figures: WeeklyInsightFigure[];
  actions: WeeklyInsightAction[];
  url: string;
  unsubscribeUrl: string;
}

const font =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const para = {
  margin: "0 0 16px",
  fontSize: 14,
  color: colors.body,
  lineHeight: "1.7",
  fontFamily: font,
};

export function weeklyInsightSubject(title: string): string {
  return title;
}

export default function WeeklyInsightEmail({
  firstName,
  orgName = "Acme Traders Ltd",
  orgLogoUrl,
  title = "More came in than went out last week",
  periodLabel = "19 Oct to 25 Oct",
  summary = "KES 420,000 came in last week and KES 310,000 went out, which leaves KES 110,000 more in than out. You sent 6 invoices and 4 got paid. 2 invoices are overdue, worth KES 85,000.",
  figures = [
    { label: "Money in", value: "KES 420,000", change: "up 12% on the week before" },
    { label: "Money out", value: "KES 310,000", change: "down 4% on the week before" },
    { label: "Net", value: "KES 110,000", change: "up 60% on the week before" },
    { label: "Overdue invoices", value: "KES 85,000", change: "2 invoices" },
  ],
  actions = [
    { text: "Follow up on 2 overdue invoices worth KES 85,000", url: "https://app.travadabooks.com/invoices?from=weekly-insight" },
    { text: "Attach receipts to 5 expenses", url: "https://app.travadabooks.com/transactions?from=weekly-insight" },
  ],
  url = "https://app.travadabooks.com/insights?from=weekly-insight",
  unsubscribeUrl = "https://app.travadabooks.com/unsubscribe",
}: Partial<Props>) {
  return (
    <EmailLayout preview={title} orgName={orgName} orgLogoUrl={orgLogoUrl}>
      <Text style={{ ...para, margin: "0 0 4px", fontSize: 12, color: colors.muted }}>
        {orgName} · {periodLabel}
      </Text>
      <Text style={{ ...para, margin: "0 0 20px", fontSize: 20, lineHeight: "1.35", color: colors.dark, fontWeight: 600 }}>
        {title}
      </Text>

      <Text style={{ ...para, margin: "0 0 24px" }}>{firstName ? `Hi ${firstName},` : "Hi,"}</Text>
      <Text style={para}>{summary}</Text>

      <table width="100%" cellPadding={0} cellSpacing={0} style={{ margin: "8px 0 16px" }}>
        <tbody>
          {figures.map((f, i) => (
            <tr key={i}>
              <td style={{ padding: "10px 0", borderBottom: `1px solid ${colors.border}`, fontSize: 13, color: colors.muted, fontFamily: font }}>
                {f.label}
              </td>
              <td style={{ padding: "10px 0", borderBottom: `1px solid ${colors.border}`, textAlign: "right", fontFamily: font }}>
                <span style={{ fontSize: 14, color: colors.dark }}>{f.value}</span>
                {f.change && <span style={{ display: "block", fontSize: 12, color: colors.muted }}>{f.change}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {actions.length > 0 && (
        <>
          <Text style={{ ...para, margin: "16px 0 4px", color: colors.dark, fontWeight: 600 }}>Worth doing this week</Text>
          {actions.map((a, i) => (
            <Text key={i} style={{ ...para, margin: "0 0 6px" }}>
              <Link href={a.url} style={{ color: "#007a55", textDecoration: "underline" }}>
                {a.text}
              </Link>
            </Text>
          ))}
        </>
      )}

      <OutlinedButton href={url}>See the full summary</OutlinedButton>

      <Text style={{ margin: "40px 0 0", fontSize: 12, color: colors.faint, fontFamily: font }}>
        You get this every Monday. To stop, turn off Weekly summary in your notification settings, or{" "}
        <Link href={unsubscribeUrl} style={{ color: colors.faint, textDecoration: "underline" }}>
          unsubscribe
        </Link>
        .
      </Text>
    </EmailLayout>
  );
}
