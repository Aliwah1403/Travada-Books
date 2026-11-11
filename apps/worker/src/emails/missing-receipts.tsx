import React from "react";
import { Text, Link } from "@react-email/components";
import { EmailLayout, OutlinedButton, colors, formatMoney } from "./layout";

export interface MissingReceiptEmailRow {
  date: string; // YYYY-MM-DD
  name: string;
  amount: number;
  currency: string;
}

interface Props {
  firstName?: string | null;
  orgName: string;
  orgLogoUrl?: string | null;
  missingCount: number;
  rows: MissingReceiptEmailRow[];
  inboxAddress?: string | null;
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

export function missingReceiptsSubject(count: number): string {
  return count === 1 ? "1 transaction needs a receipt" : `${count} transactions need a receipt`;
}

function shortDate(d: string): string {
  return new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function MissingReceiptsEmail({
  firstName,
  orgName = "Acme Traders Ltd",
  orgLogoUrl,
  missingCount = 8,
  rows = [
    { date: "2026-10-30", name: "Naivas Supermarket", amount: 4250, currency: "KES" },
    { date: "2026-10-29", name: "Safaricom Business", amount: 12000, currency: "KES" },
    { date: "2026-10-27", name: "Shell Westlands", amount: 6800, currency: "KES" },
    { date: "2026-10-24", name: "Java House", amount: 1850, currency: "KES" },
    { date: "2026-10-22", name: "Uber", amount: 920, currency: "KES" },
  ],
  inboxAddress = "acme-1a2b3c@inbox.travadabooks.com",
  url = "https://app.travadabooks.com/transactions?from=receipt-nudge",
  unsubscribeUrl = "https://app.travadabooks.com/unsubscribe",
}: Partial<Props>) {
  const more = Math.max(0, missingCount - rows.length);
  const noun = missingCount === 1 ? "expense" : "expenses";

  return (
    <EmailLayout preview={missingReceiptsSubject(missingCount)} orgName={orgName} orgLogoUrl={orgLogoUrl}>
      <Text style={{ ...para, margin: "0 0 24px" }}>{firstName ? `Hi ${firstName},` : "Hi,"}</Text>

      <Text style={para}>
        {missingCount === 1 ? "One expense" : `${missingCount} expenses`} from the last 30 days in {orgName}{" "}
        {missingCount === 1 ? "has" : "have"} no receipt attached. Here {missingCount === 1 ? "it is" : "are the most recent"}:
      </Text>

      <table width="100%" cellPadding={0} cellSpacing={0} style={{ margin: "8px 0 8px" }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ padding: "10px 0", borderBottom: `1px solid ${colors.border}`, fontSize: 13, color: colors.muted, fontFamily: font, width: 64 }}>
                {shortDate(r.date)}
              </td>
              <td style={{ padding: "10px 8px", borderBottom: `1px solid ${colors.border}`, fontSize: 14, color: colors.dark, fontFamily: font }}>
                {r.name}
              </td>
              <td style={{ padding: "10px 0", borderBottom: `1px solid ${colors.border}`, fontSize: 14, color: colors.dark, fontFamily: font, textAlign: "right", whiteSpace: "nowrap" }}>
                {formatMoney(r.amount, r.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {more > 0 && (
        <Text style={{ ...para, fontSize: 13, color: colors.muted, margin: "8px 0 16px" }}>+ {more} more</Text>
      )}

      <Text style={{ ...para, marginTop: 16 }}>
        {inboxAddress ? (
          <>
            To add {missingCount === 1 ? "it" : "them"}, forward {missingCount === 1 ? "the receipt" : "the receipts"} to{" "}
            <strong style={{ color: colors.dark }}>{inboxAddress}</strong> and we will match them to the {noun}.
          </>
        ) : (
          <>To add {missingCount === 1 ? "it" : "them"}, upload {missingCount === 1 ? "the receipt" : "the receipts"} in Travada Books.</>
        )}
      </Text>

      <OutlinedButton href={url}>Review transactions</OutlinedButton>

      <Text style={{ margin: "40px 0 0", fontSize: 12, color: colors.faint, fontFamily: font }}>
        You get this weekly while receipts are missing. To stop, turn off Missing receipts in your notification
        settings, or{" "}
        <Link href={unsubscribeUrl} style={{ color: colors.faint, textDecoration: "underline" }}>
          unsubscribe
        </Link>
        .
      </Text>
    </EmailLayout>
  );
}
