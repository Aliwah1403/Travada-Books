import { Link } from "react-router"

import { ClockCheckIcon, QuoteIcon, RepeatIcon, Sent02Icon } from "@travada-books/ui/icons"

import { FeatureCard } from "~/components/feature-card"
import { ScreenshotFrame } from "~/components/screenshot-frame"
import { Section } from "~/components/section"

// No M-Pesa anywhere in this section, not even an icon — see
// WEBSITE-PLAN.md §5 rule 4 and CLAUDE.md's voice rules.
export function InvoicingDoesItself() {
  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          The invoicing does itself.
        </h2>
        <Link
          to="/invoicing"
          className="fine-hover:text-foreground text-sm text-primary underline underline-offset-4"
        >
          See invoicing →
        </Link>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <FeatureCard icon={RepeatIcon} title="Recurring invoices">
          Same client, same amount, every month? Set it up once. Weekly, every two weeks,
          monthly, quarterly, yearly — end it on a date, end it after ten, or let it run until you
          stop it. You'll see the next three send dates before you commit to anything.
        </FeatureCard>
        <FeatureCard icon={Sent02Icon} title="Scheduled sending">
          Finished the invoice at midnight because that's when you had a moment? Send it Tuesday
          at 9am. It'll be at the top of their inbox when they sit down with coffee.
        </FeatureCard>
        <FeatureCard icon={ClockCheckIcon} title="Reminders that go out on their own">
          The invoice is late. You know it, they know it, and neither of you wants to have the
          conversation. Let the software have it instead — overdue invoices mark themselves
          overdue. Nobody has to be the bad guy.
        </FeatureCard>
        <FeatureCard icon={QuoteIcon} title="Quotes that become invoices">
          Send a quote. The customer opens it with a link — no app, no signup — and accepts. It
          becomes an invoice. You retype nothing.
        </FeatureCard>
      </div>

      <ScreenshotFrame
        label="Invoice list — paid, partially paid, unpaid, overdue"
        className="mt-10"
      />
    </Section>
  )
}
