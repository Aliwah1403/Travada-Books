import { Link } from "react-router"

import {
  ArrowRight01Icon,
  BankIcon,
  Building01Icon,
  MoneyBag02Icon,
  UserIcon,
  type Icon,
} from "@travada-books/ui/icons"

import { LearnMore } from "~/components/home/shared"
import { Eyebrow } from "~/components/site/eyebrow"
import { FeatureItem } from "~/components/site/feature-item"
import { Section } from "~/components/site/section"

/* -------------------------------------------------------------------------- */
/* 7 · Built for business here                                                 */
/* -------------------------------------------------------------------------- */

const LOCAL_FACTS: { title: string; body: string; icon: Icon }[] = [
  { title: "M-Pesa and bank statements", body: "Import the records Kenyan businesses already receive.", icon: BankIcon },
  {
    title: "KES at the centre",
    body: "Run the books in shillings while invoicing clients in other currencies.",
    icon: MoneyBag02Icon,
  },
  { title: "Built in Nairobi", body: "Product decisions come from the workflows we see around us.", icon: Building01Icon },
  { title: "Human support", body: "Get a clear answer from a person when the books need attention.", icon: UserIcon },
]

export function BuiltForHere() {
  return (
    <Section size="lg">
      <div className="grid gap-6 md:grid-cols-2 md:items-end md:gap-12">
        <div className="flex flex-col gap-4">
          <Eyebrow>Built for business here</Eyebrow>
          <h2 className="text-3xl font-medium tracking-tight text-balance md:text-4xl">
            Software that understands how business is done here.
          </h2>
        </div>
        <div className="flex flex-col items-start gap-5">
          <p className="text-lg text-pretty text-ink-muted">
            Bank statements that split debit and credit. M-Pesa records. Clients who pay in pounds while you
            run the business in shillings. Travada Books is designed around the work Kenyan businesses actually
            do.
          </p>
          <LearnMore to="/about">Why we&rsquo;re building Travada</LearnMore>
        </div>
      </div>

      <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 md:mt-16 lg:grid-cols-4">
        {LOCAL_FACTS.map((fact) => (
          <FeatureItem key={fact.title} icon={fact.icon} title={fact.title} className="bg-panel p-6">
            {fact.body}
          </FeatureItem>
        ))}
      </div>
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/* 8 · Who it's for                                                            */
/* -------------------------------------------------------------------------- */

const AUDIENCES = [
  {
    title: "Freelancers",
    body: "Stop remembering to chase invoice #14. Let the reminder go out while you keep working.",
  },
  {
    title: "Consultants",
    body: "Turn the same monthly retainer into a recurring invoice that simply runs.",
  },
  {
    title: "Small businesses",
    body: "Move the books out of the notebook and into one dependable, searchable place.",
  },
  {
    title: "Agencies",
    body: "Send quotes, get a yes, and turn them into invoices without typing the work twice.",
  },
]

export function WhoItsFor() {
  return (
    <Section size="lg" tone="canvas">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-2xl flex-col gap-4">
          <Eyebrow>Who it&rsquo;s for</Eyebrow>
          <h2 className="text-3xl font-medium tracking-tight text-balance md:text-4xl">
            For people doing the work and the books.
          </h2>
        </div>
        <LearnMore to="/who-its-for">Find your workflow</LearnMore>
      </div>

      <ul className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 md:mt-16 lg:grid-cols-4">
        {AUDIENCES.map((audience, i) => (
          <li key={audience.title} className="flex">
            <Link
              to="/who-its-for"
              className="flex w-full flex-col bg-panel p-6 transition-colors active:opacity-80 fine-hover:bg-canvas"
            >
              <span className="font-mono text-xs tracking-wide text-ink-subtle">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-10 text-lg font-medium text-ink">{audience.title}</h3>
              <p className="mt-2 flex-1 text-sm text-pretty text-ink-muted">{audience.body}</p>
              <ArrowRight01Icon className="mt-6 size-4 text-ink-subtle" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}
