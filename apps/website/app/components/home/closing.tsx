import { Link } from "react-router"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@travada-books/ui/components/accordion"
import { buttonVariants } from "@travada-books/ui/components/button"
import { ArrowRight01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { AppLink } from "~/components/app-link"
import { ARROW_NUDGE, LearnMore } from "~/components/home/shared"
import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"
import { FAQ_ITEMS, type FaqItem } from "~/data/faq"
import { PRICING_PUBLISHED } from "~/data/pricing"
import { CONTACT_EMAIL } from "~/data/site"

/* -------------------------------------------------------------------------- */
/* 11 · FAQ                                                                    */
/* -------------------------------------------------------------------------- */

// Same data as the FAQ JSON-LD the calling route's meta() emits. Home uses
// the defaults; feature pages pass their own set (components/feature/*).
export function HomeFaq({
  items = FAQ_ITEMS,
  title = "Frequently asked questions",
}: {
  items?: FaqItem[]
  title?: string
} = {}) {
  return (
    <Section size="lg">
      <div className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16">
        <div className="flex flex-col items-start gap-4">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-3xl font-medium tracking-tight text-balance md:text-4xl">{title}</h2>
          <p className="text-lg text-pretty text-ink-muted">Still have a question? A person will answer.</p>
          <LearnMore to={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LearnMore>
        </div>

        <Accordion className="rounded-lg border-line bg-panel">
          {items.map((item) => (
            <AccordionItem key={item.id} value={item.id} className="border-line data-open:bg-canvas">
              <AccordionTrigger className="px-5 py-4 text-base text-ink focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-brand-line">{item.question}</AccordionTrigger>
              <AccordionContent className="px-3 text-base leading-relaxed text-ink-muted">
                {item.id === "cost" && PRICING_PUBLISHED ? (
                  <p>
                    See our <Link to="/pricing">pricing page</Link>.
                  </p>
                ) : item.id === "contact" ? (
                  <p>
                    Email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                  </p>
                ) : (
                  <p>{item.answer}</p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/* 12 · Closing CTA                                                            */
/* -------------------------------------------------------------------------- */

// Fine grid of panel-coloured hairlines, fading out from the top right.
const PATTERN = {
  backgroundImage:
    "linear-gradient(to right, color-mix(in oklab, var(--color-panel) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--color-panel) 8%, transparent) 1px, transparent 1px)",
  backgroundSize: "32px 32px",
  maskImage: "radial-gradient(ellipse 80% 90% at 100% 0%, black, transparent 75%)",
  WebkitMaskImage: "radial-gradient(ellipse 80% 90% at 100% 0%, black, transparent 75%)",
}

export function ClosingCta() {
  return (
    <Section size="md" tone="canvas">
      <div className="relative overflow-hidden rounded-xl bg-brand px-6 py-14 text-panel sm:px-10 md:px-16 md:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={PATTERN} />
        <div className="relative grid gap-8 md:grid-cols-[3fr_2fr] md:items-end md:gap-12">
          <div>
            <p className="font-mono text-xs tracking-wide text-panel/60 uppercase">Free during beta · No card required</p>
            <h2 className="mt-5 text-4xl font-medium tracking-tight text-balance md:text-5xl">
              Do the work. <span className="block text-panel/55">Not the paperwork.</span>
            </h2>
          </div>
          <div className="flex flex-col items-start gap-6">
            <p className="text-lg text-pretty text-panel/70">Set up the books once. Give the business your attention.</p>
            <AppLink
              to="signup"
              location="cta-band"
              className={cn(buttonVariants({ size: "lg" }), "bg-panel text-sm text-brand hover:bg-panel/90", ARROW_NUDGE)}
            >
              Start free <ArrowRight01Icon aria-hidden="true" />
            </AppLink>
          </div>
        </div>
      </div>
    </Section>
  )
}
