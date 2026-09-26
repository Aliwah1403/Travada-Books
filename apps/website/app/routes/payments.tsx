import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Globe02Icon,
  ReceiptTextIcon,
  RepeatIcon,
  UserIcon,
  Wallet01Icon,
  BankIcon,
} from "@travada-books/ui/icons"

import { FeaturePage, type FeaturePageContent } from "~/components/feature/feature-page"
import { PaymentLedger } from "~/components/illustrations/payment-ledger"
import { PAYMENTS_FAQ_ITEMS } from "~/data/faq"
import { faqPageJsonLd, pageMeta } from "~/lib/seo"

// This page is about recording money that has already arrived. M-Pesa may
// appear only as a payment method you record (the FAQ), never as a way to
// collect or pay — that's the "Coming soon" roadmap item (WEBSITE-PLAN.md
// §5 rule 4). Keep it out of the meta description, hero and illustration.
// COPY: everything on this page is new — needs Curtis's approval.
// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return [
    ...pageMeta({
      title: "Payments — Travada Books",
      description:
        "Record full and part payments against an invoice. Balances, statuses and statements update themselves, and every payment lands in your books.",
      path: "/payments",
      image: "/og/default.png",
    }),
    faqPageJsonLd(PAYMENTS_FAQ_ITEMS),
  ]
}

const CONTENT: FeaturePageContent = {
  eyebrow: { label: "Payments", icon: Wallet01Icon },
  title: "Paid in parts. Tracked in full.",
  lede: "A customer sends half now and promises the rest at the end of the month. Record what came in, and Travada Books keeps the balance, the status and the statement straight until it's paid off.",
  illustration: <PaymentLedger className="mx-auto w-full max-w-xl lg:max-w-none" />,
  screenshot: "Invoice detail — payments received and the balance due",
  rows: [
    {
      label: "Record",
      icon: Wallet01Icon,
      title: "Record what arrived",
      body: "Enter the amount, the date and how it was paid, with a reference if you have one. Record the whole balance in one go, or part of it whenever money comes in.",
      screenshot: "Record payment dialog — amount, date, method and reference",
    },
    {
      label: "Status",
      icon: RepeatIcon,
      title: "The status sorts itself out",
      body: "Pay part of an invoice and it shows as part-paid, with the balance left to pay. Pay the rest and it's marked paid. Delete a payment recorded by mistake and the status corrects itself.",
      screenshot: "Invoice list — part-paid badge with the balance due",
    },
    {
      label: "Statements",
      icon: ReceiptTextIcon,
      title: "Statements that add up",
      body: "A customer's statement lists each invoice as a charge and what's been paid against it, with a running balance from the opening figure to what's owed today.",
      screenshot: "Statement — charges, payments and a running balance",
    },
    {
      label: "Books",
      icon: BankIcon,
      title: "In your books, too",
      body: "Every payment you record also lands in your transactions, linked to the invoice it paid, so your cash figures and your invoices never disagree.",
      screenshot: "Transactions — a payment linked to its invoice",
    },
  ],
  details: [
    {
      title: "Paid in full? One click.",
      body: "Mark an invoice as paid and the whole balance is recorded for you.",
      icon: CheckmarkCircle02Icon,
    },
    {
      title: "Overpayments checked",
      body: "Recording more than the balance asks you to confirm it first, so typos don't slip through.",
      icon: Alert02Icon,
    },
    {
      title: "Customer totals",
      body: "Each customer's page shows what's been invoiced, paid and still owed, part payments included.",
      icon: UserIcon,
    },
    {
      title: "Any currency",
      body: "Payments on invoices in other currencies still add up in your shilling totals.",
      icon: Globe02Icon,
    },
  ],
  faq: { title: "Payments questions", items: PAYMENTS_FAQ_ITEMS },
}

export default function Payments() {
  return <FeaturePage content={CONTENT} />
}
