import React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, OutlinedButton, colors } from "./layout";

interface Props {
  count: number;
  viewUrl: string;
}

export default function UpcomingInvoicesEmail({
  count = 3,
  viewUrl = "https://books.travadasys.com/invoices?recurring=true",
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const plural = count === 1;

  return (
    <EmailLayout
      preview={
        plural
          ? "You have 1 invoice scheduled for tomorrow"
          : `You have ${count} invoices scheduled for tomorrow`
      }
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
        {plural ? "You have 1 invoice" : `You have ${count} invoices`}
        <br />
        scheduled for tomorrow
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
        {plural ? "Recurring invoice" : "Recurring invoices"}
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
        {plural
          ? "A recurring invoice is scheduled to be generated and sent to your customer tomorrow."
          : `${count} recurring invoices are scheduled to be generated and sent to your customers tomorrow.`}
      </Text>
      <Text
        style={{
          margin: "0 0 40px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.6",
          fontFamily: font,
        }}
      >
        Review the recurring series settings or pause any series if needed
        before {plural ? "it is" : "they are"} sent.
      </Text>

      {/* CTA */}
      <OutlinedButton href={viewUrl}>View Invoices</OutlinedButton>
    </EmailLayout>
  );
}
