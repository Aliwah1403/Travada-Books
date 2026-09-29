import type { ReactNode } from "react"
import { Link } from "react-router"

import {
  Building01Icon,
  ChartLineData01Icon,
  EyeIcon,
  Globe02Icon,
  TargetIcon,
  type Icon,
} from "@travada-books/ui/icons"

import { ClosingCta } from "~/components/home/closing"
import { LearnMore } from "~/components/home/shared"
import { FounderSignature } from "~/components/about/founder-signature"
import { Eyebrow } from "~/components/site/eyebrow"
import { FeatureItem } from "~/components/site/feature-item"
import { Section } from "~/components/site/section"
import { SectionHeading } from "~/components/site/section-heading"
import { CONTACT_EMAIL } from "~/data/site"
import { organizationJsonLd, pageMeta } from "~/lib/seo"
import { ogImage } from "~/lib/og"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return [
    ...pageMeta({
      title: "About Travada Books — Built in Nairobi, for Businesses Everywhere",
      description:
        "Travada Books is invoicing and bookkeeping software built by Travada Systems in Nairobi. We were our own first customer, and we build it for small businesses and freelancers everywhere.",
      path: "/about",
      image: ogImage("about"),
    }),
    organizationJsonLd(),
  ]
}

// Editorial single column (Midday /story): one measure for the whole
// story, h2 section breaks, large body text. No photos.
const COLUMN = "mx-auto w-full max-w-2xl"

// The origin story, told as a short essay (Midday /story): plain section
// labels, prose paragraphs, then the founders' names and signatures.
// COPY: needs Curtis's approval.
const STORY: { label: string; paragraphs: ReactNode[] }[] = [
  {
    label: "Where it started",
    paragraphs: [
      "Travada Books didn’t start as a product. It started as a chore. At Travada Systems, every month meant rebuilding the same invoices for our customers, sending them by hand, and then trying to remember which ones had actually been paid.",
      "The work itself was going fine. The paperwork around it wasn’t. We kept a spreadsheet, then a second one, then a notebook for the things the spreadsheets missed.",
    ],
  },
  {
    label: "Then we heard it again",
    paragraphs: [
      "Around the same time, we met an agent who was invoicing his clients exactly the way we were: copying last month’s invoice, changing the date, and chasing payments one phone call at a time.",
      "Two businesses doing completely different work, stuck on the same problem. That told us something. The workflow was broken, not the people using it.",
    ],
  },
  {
    label: "So we built the system we wanted",
    paragraphs: [
      "We built Travada Books to take that routine off our hands. Invoices that send on schedule. Reminders that follow up on their own. Statements that sort themselves, and receipts that find the transaction they belong to.",
      "Today it runs our own invoicing and bookkeeping, and every feature starts with someone running a real business who needed it. We build it in Nairobi, where mobile money, statements in every layout and clients who pay in another currency are simply how business works. That’s why Travada Books handles them out of the box, for businesses here and everywhere else.",
    ],
  },
]

const PRINCIPLES: { title: string; body: ReactNode; icon: Icon }[] = [
  {
    title: "Built from the work",
    body: "Every feature starts with a real workflow: a late invoice, a statement that will not import cleanly, or a receipt lost in email.",
    icon: TargetIcon,
  },
  {
    title: "Clear over clever",
    body: "You should not need accounting knowledge to know who has paid you, what you spent, or what needs attention.",
    icon: EyeIcon,
  },
  {
    title: "Real-world by design",
    body: "Mobile money, multiple currencies, and bank statements in every layout are core product decisions — not regional add-ons.",
    icon: Globe02Icon,
  },
  {
    title: "Open about progress",
    body: (
      <>
        We publish what ships in{" "}
        <Link
          to="/updates"
          className="text-brand underline underline-offset-2 transition-colors active:opacity-80 fine-hover:text-brand-line"
        >
          Updates
        </Link>
        , and we say plainly when something such as eTIMS support is still coming.
      </>
    ),
    icon: ChartLineData01Icon,
  },
]

function Story() {
  return (
    <Section size="lg">
      <div className={COLUMN}>
        <Eyebrow icon={Building01Icon}>About Travada Books</Eyebrow>
        <h1 className="mt-6 text-5xl font-medium tracking-tight text-balance md:text-6xl">
          We were our own first customer.
        </h1>
        <p className="mt-6 text-xl text-pretty text-ink-muted">
          Travada Books is invoicing and bookkeeping software built by Travada Systems in Nairobi, for small
          businesses and freelancers everywhere.
        </p>

        {STORY.map((part) => (
          <section key={part.label} className="mt-14 border-t border-line pt-10 md:mt-16 md:pt-12">
            <h2 className="text-base font-medium text-ink">{part.label}</h2>
            <div className="mt-4 flex flex-col gap-5">
              {part.paragraphs.map((paragraph, i) => (
                <p key={i} className="text-lg text-pretty text-ink-muted">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}

        <p className="mt-12 text-lg font-medium text-pretty text-ink">
          {/* COPY: needs Curtis's approval */}
          The work is yours. The paperwork shouldn’t be.
        </p>

        {/* Sign-off: founders' signatures (Nate's is still a placeholder — see founder-signature.tsx). */}
        <div className="mt-12">
          <div className="flex items-end gap-8">
            <FounderSignature name="curtis" />
            <FounderSignature name="nate" />
          </div>
          <p className="mt-4 text-sm font-medium text-ink">Curtis &amp; Nate</p>
          <p className="text-sm text-ink-muted">Founders, Travada Systems</p>
        </div>
      </div>
    </Section>
  )
}

function Principles() {
  return (
    <Section size="lg" tone="canvas">
      <SectionHeading eyebrow={<Eyebrow>How we build</Eyebrow>} title="Built in Nairobi. Built for business owners everywhere." />
      <div className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2 md:mt-16 lg:grid-cols-4">
        {PRINCIPLES.map((principle) => (
          <FeatureItem key={principle.title} icon={principle.icon} title={principle.title} className="bg-panel p-6">
            {principle.body}
          </FeatureItem>
        ))}
      </div>
    </Section>
  )
}

function Contact() {
  return (
    <Section size="lg">
      <div className={COLUMN}>
        <div className="border border-line bg-panel p-8 md:p-10">
          {/* COPY: needs Curtis's approval (the "Made in Nairobi" label) */}
          <Eyebrow icon={Building01Icon}>Made in Nairobi</Eyebrow>
          <h2 className="mt-6 text-3xl font-medium tracking-tight text-balance md:text-4xl">Build it with us.</h2>
          <p className="mt-4 text-lg text-pretty text-ink-muted">Have a workflow we should see?</p>
          <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <LearnMore to={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LearnMore>
            <span className="font-mono text-xs tracking-wide text-ink-subtle uppercase">Est. 2026 · Nairobi, Kenya</span>
          </div>
        </div>
      </div>
    </Section>
  )
}

export default function About() {
  return (
    <>
      <Story />
      <Principles />
      <Contact />
      <ClosingCta />
    </>
  )
}
