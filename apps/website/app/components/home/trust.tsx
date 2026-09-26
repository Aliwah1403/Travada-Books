import {
  Delete01Icon,
  Download01Icon,
  LockPasswordIcon,
  MoneyExchange01Icon,
  TaxesIcon,
  type Icon,
} from "@travada-books/ui/icons"

import { LearnMore } from "~/components/home/shared"
import { SafeBooks } from "~/components/illustrations/safe-books"
import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"
import { CONTACT_EMAIL } from "~/data/site"

/* -------------------------------------------------------------------------- */
/* 9 · Your books, kept safe                                                   */
/* -------------------------------------------------------------------------- */

// Only claims that are true today. No certifications, encryption or uptime
// claims (WEBSITE-REDO-PLAN.md §4 home #9).
const SAFETY: { title: string; body: string; icon: Icon }[] = [
  {
    title: "Only your team sees them",
    body: "Each business’s books are visible only to the members of that business.",
    icon: LockPasswordIcon,
  },
  {
    title: "Export everything, any time",
    body: "Download all of your organisation’s data whenever you want it. It’s yours.",
    icon: Download01Icon,
  },
  {
    title: "Leave cleanly",
    body: "Delete your organisation and its data, with a full export offered first.",
    icon: Delete01Icon,
  },
]

export function KeptSafe() {
  return (
    <Section tone="dark" size="lg">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <Eyebrow className="text-panel/60">Trust</Eyebrow>
          {/* COPY: needs Curtis's approval — heading, lede and the three claims below */}
          <h2 className="mt-4 text-3xl font-medium tracking-tight text-balance md:text-4xl">
            Your books, kept safe.
          </h2>
          <p className="mt-4 max-w-lg text-lg text-pretty text-panel/70">
            Your records belong to your business, and you decide what happens to them.
          </p>
          <ul className="mt-10 flex flex-col gap-px overflow-hidden rounded-lg border border-panel/15 bg-panel/15">
            {SAFETY.map(({ title, body, icon: SafetyIcon }) => (
              <li key={title} className="flex gap-4 bg-dark p-5">
                <SafetyIcon className="mt-0.5 size-5 shrink-0 text-brand-soft" aria-hidden="true" />
                <div>
                  <h3 className="text-base font-medium text-panel">{title}</h3>
                  <p className="mt-1 text-sm text-pretty text-panel/70">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <SafeBooks className="mx-auto h-auto w-full max-w-lg" />
      </div>
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/* 10 · Coming soon                                                            */
/* -------------------------------------------------------------------------- */

// Roadmap — always labelled "Coming soon" and paired with a way to hear
// when it ships (WEBSITE-PLAN.md §5 rule 5). Copy from data/site.ts.
const ROADMAP: { title: string; body: string; icon: Icon }[] = [
  { title: "eTIMS-ready invoicing", body: "Invoices that meet KRA eTIMS requirements.", icon: TaxesIcon },
  { title: "Pay invoices by M-Pesa", body: "Let customers pay straight from the invoice.", icon: MoneyExchange01Icon },
]

export function ComingSoon() {
  return (
    <Section size="md" tone="canvas">
      <div className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-16">
        <div className="flex flex-col items-start gap-4">
          <Eyebrow>Coming soon</Eyebrow>
          {/* COPY: new heading + line — needs Curtis's approval */}
          <h2 className="text-3xl font-medium tracking-tight text-balance md:text-4xl">What we&rsquo;re building next.</h2>
          <p className="text-lg text-pretty text-ink-muted">
            Neither is live yet. We&rsquo;ll announce both in Updates the day they ship.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
            <LearnMore to="/updates">Follow Updates</LearnMore>
            <LearnMore to={`mailto:${CONTACT_EMAIL}`}>Ask us about it</LearnMore>
          </div>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {ROADMAP.map(({ title, body, icon: RoadmapIcon }) => (
            <li key={title} className="flex flex-col rounded-lg border border-dashed border-line-strong bg-panel/60 p-6">
              <div className="flex items-center justify-between gap-3">
                <RoadmapIcon className="size-5 text-ink-subtle" aria-hidden="true" />
                <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-xs tracking-wide text-ink-muted uppercase">
                  Coming soon
                </span>
              </div>
              <h3 className="mt-6 text-lg font-medium text-ink">{title}</h3>
              <p className="mt-1.5 text-sm text-pretty text-ink-muted">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
