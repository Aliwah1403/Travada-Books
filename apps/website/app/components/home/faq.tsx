import { Link } from "react-router"

import { cn } from "@travada-books/ui/lib/utils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@travada-books/ui/components/accordion"
import { ArrowRight01Icon } from "@travada-books/ui/icons"

import { Section } from "~/components/section"
import { FAQ_ITEMS, type FaqItem } from "~/data/faq"
import { PRICING_PUBLISHED } from "~/data/pricing"
import { CONTACT_EMAIL } from "~/data/site"

type FaqProps = {
  items?: FaqItem[]
  /** Small-caps kicker above the heading — the eyebrow every other converged section has. */
  eyebrow?: string | null
  heading?: string
  /** Supporting line above the contact link, left column. */
  contactPrompt?: string
  /** Section-level override — used by the home page's larger, custom-padded treatment. */
  className?: string
  /** Heading-level override — used by the home page's bigger display heading. */
  headingClassName?: string
  /** Accordion-level override — used by the home page's wider top margin. */
  accordionClassName?: string
}

// Reused on 5 pages (home, pricing, inbox, invoicing, statement-import)
// with their own `items` — the "cost" and "contact" ids only ever appear in
// the home FAQ_ITEMS set, so the special cases below are inert (never
// matched) for every other page's items. Do not drop them.
//
// Two-column editorial rhythm (WEBSITE-POLISH-PLAN.md Part B, B3): heading
// + contact prompt on the left, accordion on the right — the same
// heading-left/content-right shape as every other converged marketing
// section (feature-hero, built-for-here, audience, integrations). This is
// the *base* layout for all five callers, not an opt-in — the plan calls
// this component out as "reused on 4 pages, so one change lands
// everywhere," and the old bare centered column was equally weak on all
// five, not just home.
//
// `data-dark-surface` + `--website-*` tokens (matching every other
// converged section) make this self-contained for dark mode. Previously
// this component used the generic shadcn `text-foreground`/
// `text-muted-foreground` tokens instead of `--website-*`, and none of the
// 5 callers wrapped it in a dark-surface ancestor. Both token families are
// independently theme-aware, but mixing them produced a visible seam
// against the neighbouring `--website-paper` sections on the 3 feature
// pages (inbox/invoicing/statement-import), whose FeatureRows and
// IntegrationsSection are already `data-dark-surface`. This switches the
// whole component onto the website token family so it's consistent
// everywhere, not just correct in isolation.
export function Faq({
  items = FAQ_ITEMS,
  eyebrow = "FAQ",
  heading = "Frequently asked questions",
  contactPrompt = "Still have a question?",
  className,
  headingClassName,
  accordionClassName,
}: FaqProps) {
  return (
    <Section
      data-dark-surface
      className={cn(
        "bg-[var(--website-paper)] text-[var(--website-ink)]",
        className,
      )}
      containerClassName="max-w-7xl"
    >
      <div className="grid gap-[clamp(2.5rem,6vw,5rem)] lg:grid-cols-[.85fr_1.15fr] lg:items-start">
        <div>
          {eyebrow ? (
            <p className="flex items-center gap-[.65rem] text-[.64rem] font-semibold uppercase leading-none tracking-[.11em] text-[var(--website-green)] font-sans">
              <span aria-hidden="true" className="h-px w-[1.8rem] bg-current" />
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={cn(
              eyebrow && "mt-[1.3rem]",
              "max-w-[24rem] text-[clamp(2.2rem,3.8vw,3.4rem)] leading-[.98] tracking-[-.055em] text-[var(--website-ink)] [font-weight:520]",
              headingClassName,
            )}
          >
            {heading}
          </h2>
          <p className="mt-[1.5rem] max-w-[22rem] text-[.85rem] leading-[1.7] text-[color-mix(in_oklab,var(--website-ink)_58%,transparent)] font-heading">
            {contactPrompt}
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-[1rem] inline-flex items-center gap-[.55rem] border-b border-current pb-[.3rem] text-[var(--website-green)] font-sans text-[.7rem] font-semibold leading-none transition-colors fine-hover:text-[color-mix(in_oklab,var(--website-green)_80%,var(--website-ink))]"
          >
            {CONTACT_EMAIL} <ArrowRight01Icon className="w-[.85rem]" />
          </a>
        </div>

        <Accordion
          className={cn(
            "border-[var(--website-line)] bg-[var(--website-paper)]",
            accordionClassName,
          )}
        >
          {items.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="border-[var(--website-line)]"
            >
              <AccordionTrigger className="text-[var(--website-ink)]">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-[color-mix(in_oklab,var(--website-ink)_62%,transparent)]">
                {item.id === "cost" && PRICING_PUBLISHED ? (
                  <p>
                    See our <Link to="/pricing">pricing page</Link>.
                  </p>
                ) : item.id === "contact" ? (
                  <p>
                    Email us at{" "}
                    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
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
