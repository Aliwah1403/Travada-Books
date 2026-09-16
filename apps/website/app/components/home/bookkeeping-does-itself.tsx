import { Link } from "react-router"

import { BankIcon, Globe02Icon, Tag01Icon, VaultIcon } from "@travada-books/ui/icons"

import { FeatureCard } from "~/components/feature-card"
import { ScreenshotFrame } from "~/components/screenshot-frame"
import { Section } from "~/components/section"

export function BookkeepingDoesItself() {
  return (
    <Section muted>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          The bookkeeping does itself.
        </h2>
        <Link
          to="/statement-import"
          className="fine-hover:text-foreground text-sm text-primary underline underline-offset-4"
        >
          See statement import →
        </Link>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <FeatureCard icon={BankIcon} title="Bring in a year of records in one go">
          Upload your bank statement or your M-Pesa records — a CSV, or a PDF, whatever your bank
          gave you. It reads the file and works out which column is the date, the amount, money in
          and money out — including statements that split debit and credit into two separate
          columns, because plenty of them do. Hundreds of transactions. One upload. About a
          minute.
        </FeatureCard>
        <FeatureCard icon={Tag01Icon} title="They sort themselves">
          Transactions get categorised as they arrive. Need to mark a hundred of them as paid by
          M-Pesa, or cash, or bank transfer? That's one action, not a hundred.
        </FeatureCard>
        <FeatureCard icon={VaultIcon} title="Everything else, findable">
          Receipts and documents, uploaded once and searchable later. A statement for the customer
          who owes you across six invoices — one click, one link to send them.
        </FeatureCard>
        <FeatureCard icon={Globe02Icon} title="Bill in any currency">
          Invoice a client in London in pounds. See your own totals in shillings. Both are true at
          the same time, and you never do the arithmetic.
        </FeatureCard>
      </div>

      <ScreenshotFrame label="Statement import — column mapping" className="mt-10" />
    </Section>
  )
}
