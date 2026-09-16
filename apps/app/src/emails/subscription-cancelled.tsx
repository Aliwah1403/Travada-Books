import React from "react";
import { Text, Link } from "@react-email/components";
import { EmailLayout, OutlinedButton, colors } from "./layout";

interface Props {
  firstName: string;
}

export default function SubscriptionCancelledEmail({
  firstName = "Curtis",
}: Partial<Props>) {
  const font =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <EmailLayout
      preview="We're sad to see you go — help us make Travada Books better"
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
        Sorry to see you go,
        <br />
        {firstName}
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
        Your subscription has been cancelled
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
        Your Travada Books subscription has been cancelled. You'll retain access
        to your account until the end of your current billing period, after
        which your account will be locked.
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
        We'd genuinely love to know what we could have done better. Was
        something missing? Did something not work the way you expected? Your
        feedback directly shapes what we build next.
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
        Just hit reply — we read every response.
      </Text>

      {/* CTA */}
      <OutlinedButton href="mailto:hello@travadasys.com?subject=Feedback on Travada Books">
        Share Feedback
      </OutlinedButton>

      {/* Come back anytime */}
      <Text
        style={{
          margin: "40px 0 0",
          fontSize: 13,
          color: colors.muted,
          textAlign: "center",
          lineHeight: "1.6",
          fontFamily: font,
        }}
      >
        Changed your mind?{" "}
        <Link
          href="https://books.travadasys.com/settings/billing"
          style={{ color: colors.muted, textDecorationLine: "underline" }}
        >
          Reactivate your subscription
        </Link>{" "}
        anytime — your data will still be there.
      </Text>
    </EmailLayout>
  );
}
