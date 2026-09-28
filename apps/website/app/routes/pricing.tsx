import { buttonVariants } from "@travada-books/ui/components/button"
import { ArrowRight01Icon, MoneyBag02Icon, TickIcon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { AppLink } from "~/components/app-link"
import { ClosingCta, HomeFaq } from "~/components/home/closing"
import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"
import { SectionHeading } from "~/components/site/section-heading"
import { PRICING_FAQ_ITEMS, PRICING_PLANS, PRICING_PUBLISHED, type PricingPlan } from "~/data/pricing"
import { faqPageJsonLd, organizationJsonLd, pageMeta, softwareApplicationJsonLd } from "~/lib/seo"
import { ARROW_NUDGE } from "~/components/home/shared"

// Dummy page (WEBSITE-PLAN.md §6 "/pricing"): every value comes from
// data/pricing.ts. PRICING_PUBLISHED still drives noindex here, and the
// header, footer, sitemap and home FAQ elsewhere. No founder/beta pricing.
// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return [
    ...pageMeta({
      title: "Pricing — Travada Books",
      description:
        "Pricing for Travada Books is still being decided. Sign up free today — nothing changes until it's announced.",
      path: "/pricing",
      image: "/og/pricing.png",
      noindex: !PRICING_PUBLISHED,
    }),
    organizationJsonLd(),
    softwareApplicationJsonLd(PRICING_PLANS),
    faqPageJsonLd(PRICING_FAQ_ITEMS),
  ]
}

function PlanCard({ plan }: { plan: PricingPlan }) {
  const featured = plan.featured === true
  return (
    <li
      className={cn(
        "relative flex flex-col bg-panel p-8",
        // An inset ring, so the highlight doesn't shift the hairline grid.
        // Opaque tint: a translucent fill would show the grey grid behind it.
        featured && "bg-[color-mix(in_oklab,var(--color-brand-soft)_45%,var(--color-panel))] ring-1 ring-brand-line ring-inset",
      )}
    >
      <h2 className="text-lg font-medium text-ink">{plan.name}</h2>
      {/* Two lines reserved so the price rows line up across cards. */}
      <p className="mt-1.5 min-h-10 text-sm text-pretty text-ink-muted">{plan.audience}</p>

      <div className="mt-8 flex items-baseline gap-2 border-t border-line pt-8">
        <span className="text-4xl font-medium tracking-tight text-ink">{plan.price}</span>
        <span className="text-sm text-ink-muted">{plan.period}</span>
      </div>

      <ul className="mt-8 flex flex-1 flex-col gap-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-pretty text-ink">
            <TickIcon className="mt-0.5 size-4 shrink-0 text-brand-line" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>

      <AppLink
        to="signup"
        location="pricing"
        className={cn(
          buttonVariants({ size: "lg", variant: featured ? "default" : "outline" }),
          "mt-10 w-full text-sm",
          !featured && "bg-panel",
          ARROW_NUDGE,
        )}
      >
        {plan.ctaLabel} <ArrowRight01Icon aria-hidden="true" />
      </AppLink>
    </li>
  )
}

export default function Pricing() {
  return (
    <>
      <Section size="lg">
        <SectionHeading
          as="h1"
          align="center"
          eyebrow={<Eyebrow icon={MoneyBag02Icon}>Pricing</Eyebrow>}
          title="Simple pricing, on the way."
          lede="We're still deciding what this costs. Sign up free today — nothing changes until pricing is announced."
        />

        <ul
          className={cn(
            "mx-auto mt-12 grid max-w-4xl gap-px border border-line bg-line md:mt-16",
            PRICING_PLANS.length > 1 && "md:grid-cols-2",
          )}
        >
          {PRICING_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </ul>
      </Section>

      <HomeFaq items={PRICING_FAQ_ITEMS} title="Pricing — frequently asked questions" />
      <ClosingCta />
    </>
  )
}
