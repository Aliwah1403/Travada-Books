import type { ComponentType } from "react"
import { Link } from "react-router"

import {
  ArrowRight01Icon,
  BankIcon,
  Calendar01Icon,
  File01Icon,
  FileEditIcon,
  Globe02Icon,
  InboxIcon,
  MoneyExchange01Icon,
  Notification01Icon,
  RepeatIcon,
  Tag01Icon,
  UserIcon,
  Wallet01Icon,
  type Icon,
} from "@travada-books/ui/icons"

import { ClosingCta } from "~/components/home/closing"
import {
  AgencySpot,
  BacklogSpot,
  ConsultantSpot,
  FreelancerSpot,
  SmallBusinessSpot,
} from "~/components/illustrations/spots"
import { Eyebrow } from "~/components/site/eyebrow"
import { FeatureItem } from "~/components/site/feature-item"
import { Section } from "~/components/site/section"
import { Split } from "~/components/site/split"
import { PERSONAS } from "~/data/personas"
import { pageMeta } from "~/lib/seo"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return pageMeta({
    title: "Who it's for — Travada Books",
    description:
      "Freelancers, retainer consultants, small business owners, agencies — if invoicing or bookkeeping is eating your week, Travada Books is for you.",
    path: "/who-its-for",
    image: "/og/who-its-for.png",
  })
}

type Spot = ComponentType<{ className?: string }>

type PersonaFeature = { title: string; body: string; icon: Icon; href: string }

// Keyed by persona id (data/personas.ts). ⚠️ No "M-Pesa" in any invoicing
// feature below — it appears only in the import-led rows (WEBSITE-PLAN.md §5).
/* COPY: every feature title and body below needs Curtis's approval */
const PERSONA_EXTRAS: Record<string, { spot: Spot; features: PersonaFeature[] }> = {
  freelancer: {
    spot: FreelancerSpot,
    features: [
      {
        title: "Reminders",
        body: "Set it once and the reminder goes out on schedule, whether you remembered or not.",
        icon: Notification01Icon,
        href: "/invoicing",
      },
      {
        title: "Customer portal",
        body: "One link with every invoice you've sent a client, and what's still owed at the top.",
        icon: Globe02Icon,
        href: "/customer-portal",
      },
      {
        title: "Part payments",
        body: "Record what came in, and the balance and status keep themselves straight.",
        icon: Wallet01Icon,
        href: "/payments",
      },
    ],
  },
  "retainer-consultant": {
    spot: ConsultantSpot,
    features: [
      {
        title: "Recurring invoices",
        body: "Set the amount and frequency once. It sends itself until the retainer ends.",
        icon: RepeatIcon,
        href: "/invoicing",
      },
      {
        title: "The next three dates",
        body: "See exactly when the next three invoices will go out before you commit.",
        icon: Calendar01Icon,
        href: "/invoicing",
      },
      {
        title: "Customer statements",
        body: "One statement per client, with the total, what's paid and the balance.",
        icon: File01Icon,
        href: "/payments",
      },
    ],
  },
  "notebook-owner": {
    spot: SmallBusinessSpot,
    features: [
      {
        title: "Statement import",
        body: "Upload the bank or M-Pesa statements you already have, CSV or PDF, and they come in sorted.",
        icon: BankIcon,
        href: "/statement-import",
      },
      {
        title: "Inbox",
        body: "Receipts pulled in from Gmail or Outlook and matched to their transactions.",
        icon: InboxIcon,
        href: "/inbox",
      },
      {
        title: "Payments",
        body: "Record what customers paid, in full or in parts, and see who still owes what.",
        icon: Wallet01Icon,
        href: "/payments",
      },
    ],
  },
  agency: {
    spot: AgencySpot,
    features: [
      {
        title: "Quotes",
        body: "Clients accept from a link, no signup, and the invoice is drafted for you.",
        icon: FileEditIcon,
        href: "/quotes",
      },
      {
        title: "Customer portal",
        body: "Every quote, invoice and statement for a client, behind one link.",
        icon: Globe02Icon,
        href: "/customer-portal",
      },
      {
        title: "Any currency",
        body: "Bill clients in their currency and see your totals in shillings.",
        icon: MoneyExchange01Icon,
        href: "/invoicing",
      },
    ],
  },
  "mpesa-backlog": {
    spot: BacklogSpot,
    features: [
      {
        title: "Statement import",
        body: "A year of M-Pesa statements in one upload, read and sorted as it comes in.",
        icon: BankIcon,
        href: "/statement-import",
      },
      {
        title: "Categories",
        body: "Every transaction gets a category, ready for you to check.",
        icon: Tag01Icon,
        href: "/statement-import",
      },
      {
        title: "Receipts attached",
        body: "Receipts from your inbox land on the transactions they belong to.",
        icon: InboxIcon,
        href: "/inbox",
      },
    ],
  },
}

// The four hero tiles (same short labels as the home "Who it's for" cards).
const HERO_TILES: { id: string; label: string; spot: Spot }[] = [
  { id: "freelancer", label: "Freelancers", spot: FreelancerSpot },
  { id: "retainer-consultant", label: "Consultants", spot: ConsultantSpot },
  { id: "notebook-owner", label: "Small businesses", spot: SmallBusinessSpot },
  { id: "agency", label: "Agencies", spot: AgencySpot },
]

function Hero() {
  return (
    <Section flush>
      <Split
        center
        className="md:grid-cols-1 lg:grid-cols-[6fr_6fr]"
        startClassName="md:border-r-0 md:border-b lg:border-r lg:border-b-0 md:py-24 lg:py-28"
        endClassName="lg:px-8"
        start={
          <div className="flex flex-col items-start">
            <Eyebrow icon={UserIcon}>Who it&rsquo;s for</Eyebrow>
            <h1 className="mt-6 text-5xl font-medium tracking-tight text-balance md:text-6xl">
              Built for the person doing everything.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-pretty text-ink-muted">
              Travada Books is invoicing and bookkeeping software for freelancers, consultants, agencies, and small
              businesses in Kenya — the people doing the work and keeping the business moving.
            </p>
          </div>
        }
        end={
          <ul className="grid grid-cols-2 gap-px border border-line bg-line">
            {HERO_TILES.map(({ id, label, spot: SpotArt }) => (
              <li key={id} className="flex">
                <a
                  href={`#${id}`}
                  className="flex w-full flex-col items-center gap-3 bg-panel px-3 pt-4 pb-5 transition-colors active:opacity-80 fine-hover:bg-canvas"
                >
                  <SpotArt className="w-full max-w-48" />
                  <span className="font-mono text-xs tracking-wide text-ink-muted uppercase">{label}</span>
                </a>
              </li>
            ))}
          </ul>
        }
      />
    </Section>
  )
}

function FeatureLink({ feature }: { feature: PersonaFeature }) {
  return (
    <li className="flex">
      <Link
        to={feature.href}
        className="flex w-full items-start justify-between gap-4 bg-panel p-6 transition-colors active:opacity-80 fine-hover:bg-canvas fine-hover:[&_[data-arrow]]:translate-x-0.5 fine-hover:[&_[data-arrow]]:text-ink"
      >
        <FeatureItem icon={feature.icon} title={feature.title}>
          {feature.body}
        </FeatureItem>
        <ArrowRight01Icon
          data-arrow=""
          className="mt-0.5 size-4 shrink-0 text-ink-subtle transition-[color,transform] duration-150 [transition-timing-function:var(--ease-out)]"
          aria-hidden="true"
        />
      </Link>
    </li>
  )
}

function PersonaRows() {
  return (
    <>
      {PERSONAS.map((persona, index) => {
        const extras = PERSONA_EXTRAS[persona.id]
        if (!extras) return null
        const SpotArt = extras.spot
        return (
          <Section key={persona.id} flush id={persona.id} className="scroll-mt-16">
            <Split
              reverse={index % 2 === 1}
              start={
                <div className="flex flex-col items-start">
                  <SpotArt className="w-48" />
                  <span className="mt-6 font-mono text-xs tracking-wide text-ink-subtle">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 className="mt-3 text-3xl font-medium tracking-tight text-balance md:text-4xl">{persona.title}</h2>
                  <p className="mt-4 max-w-lg text-lg text-pretty text-ink">&hellip;{persona.body}</p>
                  <p className="mt-4 max-w-lg text-base text-pretty text-ink-muted">{persona.detail}</p>
                </div>
              }
              end={
                <div className="flex h-full flex-col justify-center">
                  {/* COPY: needs Curtis's approval */}
                  <p className="font-mono text-xs tracking-wide text-ink-subtle uppercase">What helps</p>
                  <ul className="mt-4 grid gap-px border border-line bg-line">
                    {extras.features.map((feature) => (
                      <FeatureLink key={feature.title} feature={feature} />
                    ))}
                  </ul>
                </div>
              }
            />
          </Section>
        )
      })}
    </>
  )
}

export default function WhoItsFor() {
  return (
    <>
      <Hero />
      <PersonaRows />
      <ClosingCta />
    </>
  )
}
