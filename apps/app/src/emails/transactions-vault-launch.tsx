import React from "react";
import { Text, Section, Img, Hr } from "@react-email/components";
import { EmailLayout, OutlinedButton, colors } from "./layout";

interface Props {
  firstName: string;
  transactionsUrl: string;
  vaultUrl: string;
  transactionsImageUrl: string;
  vaultImageUrl: string;
}

const font =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const APP_URL = "https://books.travadasys.com";

const TRANSACTIONS_IMG =
  "https://res.cloudinary.com/dzycxaapd/image/upload/v1782981469/transactions-hero_dl5m0n.png";
const VAULT_IMG =
  "https://res.cloudinary.com/dzycxaapd/image/upload/v1782981469/vault-hero_mev4jr.png";

export default function TransactionsVaultLaunchEmail({
  firstName = "Jane",
  transactionsUrl = `${APP_URL}/transactions`,
  vaultUrl = `${APP_URL}/vault`,
  transactionsImageUrl = TRANSACTIONS_IMG,
  vaultImageUrl = VAULT_IMG,
}: Partial<Props>) {
  return (
    <EmailLayout
      preview="Two new ways to run your business: Transactions and Vault are here"
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
        Say hello to Transactions
        <br />
        and Vault
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
        Two new tools, now live in your account
      </Text>

      {/* Intro */}
      <Text
        style={{
          margin: "0 0 16px",
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
          margin: "0 0 40px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.7",
          fontFamily: font,
        }}
      >
        Invoicing was just the beginning. Today we're rolling out Transactions
        and Vault — so you can track your money and keep your paperwork
        organized without leaving Travada Books.
      </Text>

      {/* Transactions */}
      <Img
        src={transactionsImageUrl}
        width='100%'
        alt='Transactions'
        style={{
          width: "100%",
          borderRadius: 8,
          border: `1px solid ${colors.border}`,
          marginBottom: 24,
          display: "block",
        }}
      />
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
        Transactions
      </Text>
      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.7",
          fontFamily: font,
        }}
      >
        See exactly what's coming in and going out. Import your bank
        statement — as a CSV or a PDF — and Travada Books automatically
        categorizes every transaction, so you can see your income, expenses,
        and totals for any period at a glance. Attach receipts, filter your
        history, and export a clean report whenever you need one.
      </Text>

      <Section style={{ textAlign: "center", margin: "0 0 48px" }}>
        <OutlinedButton href={transactionsUrl}>
          Open Transactions
        </OutlinedButton>
      </Section>

      <Hr style={{ borderColor: colors.border, margin: "0 0 40px" }} />

      {/* Vault */}
      <Img
        src={vaultImageUrl}
        width='100%'
        alt='Vault'
        style={{
          width: "100%",
          borderRadius: 8,
          border: `1px solid ${colors.border}`,
          marginBottom: 24,
          display: "block",
        }}
      />
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
        Vault
      </Text>
      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.7",
          fontFamily: font,
        }}
      >
        A home for every receipt, contract, and statement — so you're never
        digging through email or WhatsApp to find a document again. Upload a
        file and Vault automatically sorts and labels it for you. Browse in
        list or grid view, organize things into folders, and share any
        document with a secure link — no login required on the other end.
      </Text>

      <Section style={{ textAlign: "center", margin: "0 0 48px" }}>
        <OutlinedButton href={vaultUrl}>Open Vault</OutlinedButton>
      </Section>

      <Hr style={{ borderColor: colors.border, margin: "0 0 40px" }} />

      {/* What's next */}
      <Text
        style={{
          margin: "0 0 16px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.7",
          fontFamily: font,
        }}
      >
        We're already working on what's next:
      </Text>

      <Section style={{ marginBottom: 40 }}>
        {[
          "Inbox: receipts and invoices from your email get matched to the right transaction and filed in Vault automatically",
          "Connect Gmail so receipts sync into your Inbox the moment they land",
          "Connect Outlook for the same, no manual forwarding needed",
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

      {/* Sign-off */}
      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 14,
          color: colors.body,
          lineHeight: "1.7",
          fontFamily: font,
        }}
      >
        Have questions or ideas for what we should build next? Just reply to
        this email — we read every one.
      </Text>
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
    </EmailLayout>
  );
}
