import { Button } from "@travada-books/ui/components/button"

import { AppLink } from "~/components/app-link"
import { Container } from "~/components/container"
import { CtaBand } from "~/components/cta-band"
import { Faq } from "~/components/home/faq"
import { Section } from "~/components/section"
import { PRICING_FAQ_ITEMS, PRICING_PLANS, PRICING_PUBLISHED } from "~/data/pricing"
import { faqPageJsonLd, organizationJsonLd, pageMeta, softwareApplicationJsonLd } from "~/lib/seo"

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

export default function Pricing() {
  return (
    <>
      <section className="pt-16 pb-20 md:pt-24 md:pb-24">
        <Container className="mx-auto max-w-[42rem] text-center">
          <p className="font-mono text-xs font-medium text-muted-foreground uppercase">Pricing</p>
          <h1 className="mt-3 text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
            Simple pricing, on the way.
          </h1>
          <p className="mx-auto mt-6 max-w-[50ch] font-heading text-base/relaxed text-muted-foreground">
            We're still deciding what this costs. Sign up free today — nothing changes until
            pricing is announced.
          </p>
        </Container>
      </section>

      <Section containerClassName="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.id}
            className="flex flex-col gap-6 rounded-xl border border-border bg-background p-8"
          >
            <div>
              <h2 className="text-lg font-medium text-foreground">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.audience}</p>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-medium tracking-tight text-foreground">
                {plan.price}
              </span>
              <span className="text-sm text-muted-foreground">{plan.period}</span>
            </div>
            <ul className="flex flex-1 flex-col gap-3 font-heading text-sm/relaxed text-muted-foreground">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden className="text-primary">
                    ·
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <Button render={<AppLink to="signup" location="pricing" />}>{plan.ctaLabel}</Button>
          </div>
        ))}
      </Section>

      <Faq items={PRICING_FAQ_ITEMS} heading="Pricing — frequently asked questions" />
      <CtaBand heading="Start free. Today." />
    </>
  )
}
