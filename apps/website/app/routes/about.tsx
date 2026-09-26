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
import { Eyebrow } from "~/components/site/eyebrow"
import { FeatureItem } from "~/components/site/feature-item"
import { Section } from "~/components/site/section"
import { SectionHeading } from "~/components/site/section-heading"
import { CONTACT_EMAIL } from "~/data/site"
import { organizationJsonLd, pageMeta } from "~/lib/seo"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return [
    ...pageMeta({
      title: "About Travada Books — Built in Nairobi for Kenyan Businesses",
      description:
        "Travada Books is invoicing and bookkeeping software built by Travada Systems in Nairobi. We were our own first customer and build alongside Kenyan businesses.",
      path: "/about",
      image: "/og/about.png",
    }),
    organizationJsonLd(),
  ]
}

// Editorial single column (Midday /story): one measure for the whole
// story, h2 section breaks, large body text. No photos.
const COLUMN = "mx-auto w-full max-w-2xl"

const STORY: { title: string; body: string }[] = [
  {
    title: "Our own books were getting in the way.",
    body: "Invoicing Travada Systems customers meant rebuilding the same documents, sending them by hand, and trying to remember who still owed what.",
  },
  {
    title: "Then another business described the same headache.",
    body: "An agent was struggling to invoice his clients in exactly the same way. Two businesses, one recurring problem: the workflow was broken, not the people.",
  },
  {
    title: "So we built the system we wanted to use.",
    body: "Travada Books now runs our own invoicing and bookkeeping. We build each feature alongside people operating real Kenyan businesses.",
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
    title: "Local by design",
    body: "M-Pesa, shillings, foreign-currency clients, and the shape of local bank statements are core product decisions — not regional add-ons.",
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
          Travada Books is invoicing and bookkeeping software built by Travada Systems in Nairobi for the businesses
          that keep Kenya moving.
        </p>

        <div className="mt-16 border-t border-line pt-12 md:mt-20 md:pt-16">
          <p className="font-mono text-xs tracking-wide text-ink-subtle uppercase">The origin</p>
          <p className="mt-4 text-2xl font-medium tracking-tight text-balance text-ink md:text-3xl">
            A tool born from a real invoice that still needed chasing.
          </p>
        </div>

        {STORY.map((part) => (
          <div key={part.title} className="mt-12 md:mt-14">
            <h2 className="text-2xl font-medium tracking-tight text-balance">{part.title}</h2>
            <p className="mt-4 text-lg text-pretty text-ink-muted">{part.body}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

function Principles() {
  return (
    <Section size="lg" tone="canvas">
      <SectionHeading eyebrow={<Eyebrow>How we build</Eyebrow>} title="Kenya first. Business owners first." />
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
