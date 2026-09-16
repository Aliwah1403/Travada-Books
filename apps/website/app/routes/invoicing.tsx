import { CtaBand } from "~/components/cta-band"
import { FeatureHero, FeatureRows, type FeatureRowItem } from "~/components/feature-page"
import { Faq } from "~/components/home/faq"
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
        "Recurring invoices, scheduled sending, automatic reminders and quotes that become invoices on their own. Bill in any currency, see your totals in shillings.",
      path: "/invoicing",
      image: "/og/invoicing.png",
    }),
    faqPageJsonLd(INVOICING_FAQ_ITEMS),
  ]
}

const ROWS: FeatureRowItem[] = [
  {
    title: "Recurring invoices",
    body: "Same client, same amount, every month? Set it up once. Weekly, every two weeks, monthly, quarterly or yearly — end it on a date, end it after a set number, or let it run until you stop it. You'll see the next three send dates before you commit to anything.",
    screenshotLabel: "Recurring dialog — frequency picker with the next three send dates",
    visual: "recurring",
  },
  {
    title: "Scheduled sending",
    body: "Finished the invoice at midnight because that's when you had a moment? Pick a date and time and it sends itself. It'll be at the top of their inbox when they actually sit down to look.",
    screenshotLabel: "Send dialog — schedule for a future date and time",
    visual: "schedule",
  },
  {
    title: "Reminders that go out on their own",
    body: "The invoice is late. You know it, they know it, and neither of you wants to have the conversation. Choose how many days after the due date, and let the software have it instead — the invoice marks itself overdue and the reminder goes out without you touching it.",
    screenshotLabel: "Invoice detail — overdue badge and the reminder-days setting",
    visual: "reminders",
  },
  {
    title: "Quotes that become invoices",
    body: "Send a quote. The customer opens it with a link — no app, no signup — and accepts or declines. Accept it and the invoice is already drafted, ready for you to check and send. You retype nothing.",
    screenshotLabel: "Public quote page — Accept and Decline, no login required",
    visual: "quotes",
  },
  {
    title: "Always know who owes what",
    body: "A customer who owes you across six invoices gets one statement, one link to send them. Bill a client in pounds or dollars and still see your own totals converted to shillings. And if they only pay part of what's owed, record it — the balance updates itself, and you can log what's left as it arrives.",
    screenshotLabel: "Record payment dialog — partial payment against the balance due",
    visual: "payments",
  },
]

export default function Invoicing() {
  return (
    <>
      <FeatureHero
        eyebrow="Invoicing"
        title="The invoice you don't have to remember to send."
        intro="It's the 1st of the month, so you open last month's invoice, change the date, change the number, and send it again. You'll do it again in thirty days. Set it up once instead."
      />
      <FeatureRows items={ROWS} />
      <Faq items={INVOICING_FAQ_ITEMS} heading="Invoicing — frequently asked questions" />
      <CtaBand heading="Set it once. Today." />
    </>
  )
}
