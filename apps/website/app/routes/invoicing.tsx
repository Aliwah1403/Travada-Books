import {
  Calendar01Icon,
  ClockCheckIcon,
  FileEditIcon,
  Globe02Icon,
  Invoice01Icon,
  ReceiptTextIcon,
  RepeatIcon,
  UserIcon,
  Wallet01Icon,
} from "@travada-books/ui/icons"

import { FeaturePage, type FeaturePageContent, type FeatureShot } from "~/components/feature/feature-page"
import { InvoiceOverviewMockup } from "~/components/feature/mockups/invoicing/invoice-overview"
import { RecurringSettingsMockup } from "~/components/feature/mockups/invoicing/recurring-settings"
import { ReminderTimelineMockup } from "~/components/feature/mockups/invoicing/reminder-timeline"
import { INVOICING_FAQ_ITEMS } from "~/data/faq"
import { faqPageJsonLd, pageMeta } from "~/lib/seo"

// ⚠️ No "M-Pesa" anywhere on this page — including this meta description —
// see WEBSITE-PLAN.md §5 rule 4 and CLAUDE.md's voice rules. Payment methods
// on an invoice can include M-Pesa (recorded, not collected), but the word
// itself never appears next to invoicing copy.
// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return [
    ...pageMeta({
      title: "Invoicing — Travada Books",
      description:
        "Recurring invoices, scheduled sending, automatic reminders and quotes that become invoices on their own. Bill in any currency, see your totals in your own.",
      path: "/invoicing",
      image: "/og/invoicing.png",
    }),
    faqPageJsonLd(INVOICING_FAQ_ITEMS),
  ]
}

// Stand-in until the real screenshots are captured: a dashboard screenshot,
// with an alt that describes what it actually shows. When a real shot lands,
// replace `src`, `width`/`height` and `alt` with the shot `caption` asks for.
// ⚠️ The stand-in shows "Mpesa/Bank Deposit" in an expense card — accepted
// temporarily; the real invoicing shots must not show M-Pesa anywhere.
const STAND_IN = {
  src: "/shots/dummy-dashboard.webp",
  width: 2000,
  height: 1103,
  alt: "The Travada Books dashboard, with revenue, cash flow, spending and payment score cards",
}

// Full-app screenshot; the hero cuts it into sidebar + main-content layers,
// so the real capture must keep the app's standard layout (sidebar ≈ 295 of
// 2000px). Update `sidebar` if the capture's width changes.
const HERO_SHOT: FeatureShot = {
  ...STAND_IN,
  sidebar: 295 / 2000,
  caption: "Invoices list — 8 rows, mixed statuses (Scheduled, Sent, Part-paid, Overdue, Paid), recurring marker visible, stat cards above",
}

const QUOTES_SHOT: FeatureShot = {
  ...STAND_IN,
  caption: "Quote accepted → draft invoice created (quote detail with Accepted status and the linked draft invoice)",
}

// ⚠️ Same rule for everything below: no "M-Pesa" in any copy, label or
// illustration on this page.
const CONTENT: FeaturePageContent = {
  eyebrow: { label: "Invoicing", icon: Invoice01Icon },
  title: "The invoice you don't have to remember to send.",
  lede: "It's the 1st of the month, so you open last month's invoice, change the date, change the number, and send it again. You'll do it again in thirty days. Set it up once instead.",
  heroLayout: "tilted-shot",
  shot: HERO_SHOT,
  rows: [
    {
      label: "Recurring",
      icon: RepeatIcon,
      title: "Recurring invoices",
      body: "Same client, same amount, every month? Set it up once. Weekly, every two weeks, monthly, quarterly or yearly — end it on a date, end it after a set number, or let it run until you stop it. You'll see the next three send dates before you commit to anything.",
      visual: <RecurringSettingsMockup />,
    },
    {
      label: "Scheduling",
      icon: Calendar01Icon,
      title: "Scheduled sending",
      body: "Finished the invoice at midnight because that's when you had a moment? Pick a date and time and it sends itself. It'll be at the top of their inbox when they actually sit down to look.",
      visual: <InvoiceOverviewMockup />,
    },
    {
      label: "Reminders",
      icon: ClockCheckIcon,
      title: "Reminders that go out on their own",
      body: "The invoice is late. You know it, they know it, and neither of you wants to have the conversation. Choose how many days after the due date, and let the software have it instead — the invoice marks itself overdue and the reminder goes out without you touching it.",
      visual: <ReminderTimelineMockup />,
    },
    {
      label: "Quotes",
      icon: FileEditIcon,
      title: "Quotes that become invoices",
      body: "Send a quote. The customer opens it with a link — no app, no signup — and accepts or declines. Accept it and the invoice is already drafted, ready for you to check and send. You retype nothing.",
      shot: QUOTES_SHOT,
    },
  ],
  // From the old fifth row, "Always know who owes what", split into items.
  details: [
    {
      title: "One statement per customer",
      body: "A customer who owes you across six invoices gets one statement, one link to send them.",
      icon: ReceiptTextIcon,
    },
    {
      title: "Any currency",
      body: "Bill a client in pounds, dollars or euros and still see your own totals in your base currency.",
      icon: Globe02Icon,
    },
    {
      title: "Part payments",
      body: "Record what arrives and the balance updates itself. Log the rest as it comes in.",
      icon: Wallet01Icon,
    },
    {
      title: "Customer portal",
      body: "Give a customer one link to every invoice, quote and statement you've sent them.",
      icon: UserIcon,
    },
  ],
  faq: { title: "Invoicing questions", items: INVOICING_FAQ_ITEMS },
}

export default function Invoicing() {
  return <FeaturePage content={CONTENT} />
}
