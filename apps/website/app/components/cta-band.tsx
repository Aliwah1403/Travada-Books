import { Button } from "@travada-books/ui/components/button"
import { ArrowRight01Icon } from "@travada-books/ui/icons"

import { AppLink } from "~/components/app-link"
import { Section } from "~/components/section"

type CtaBandProps = {
  heading: string
  subheading?: string
  buttonLabel?: string
}

// Reused on every page — always the signup CTA (location "cta-band").
export function CtaBand({ heading, subheading, buttonLabel = "Start free" }: CtaBandProps) {
  return (
    <Section className="cta-band" containerClassName="text-center">
      <div className="cta-band__orbit" aria-hidden="true"><i /><i /><i /></div>
      <p className="product-overline">MAKE THE BOOKS THE EASY PART</p>
      <h2>{heading}</h2>
      <p className="cta-band__subheading">
        {subheading ?? "Free during beta. No credit card required."}
      </p>
      <Button size="lg" render={<AppLink to="signup" location="cta-band" />}>
        {buttonLabel} <ArrowRight01Icon />
      </Button>
    </Section>
  )
}
