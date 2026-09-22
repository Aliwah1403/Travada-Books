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
    <Section
      data-dark-surface
      className="relative overflow-hidden bg-[var(--website-paper)] pt-0 pb-[7rem] text-[var(--website-ink)] max-[640px]:pb-[4rem]"
      containerClassName="grid grid-cols-[1.25fr_.75fr] items-end gap-[4rem] bg-[#1d211d] p-[clamp(3rem,7vw,6rem)] text-left text-[#f6f6ee] max-[900px]:grid-cols-1 max-[900px]:items-start max-[640px]:gap-[2.5rem] max-[640px]:p-[3rem_1.5rem]"
    >
      <div>
        <p className="text-[#dafa4d] font-sans text-[.53rem] font-semibold leading-none tracking-[.13em]">MAKE THE BOOKS THE EASY PART</p>
        <h2 className="mt-[1.25rem] mx-0 mb-0 max-w-[56rem] text-[clamp(2.8rem,6vw,6rem)] leading-[.92] tracking-[-.07em] [font-weight:520] text-balance">{heading}</h2>
      </div>
      <div className="flex flex-col items-start">
        <p className="mt-0 mx-0 mb-[2rem] max-w-[23rem] text-[#aab1a8] font-heading text-[.9rem] leading-[1.6]">
          {subheading ?? "Free during beta. No credit card required."}
        </p>
        <Button
          size="lg"
          className="rounded-[.5rem] bg-[#dafa4d] px-[1.3rem] text-[#151714]"
          render={<AppLink to="signup" location="cta-band" />}
        >
          {buttonLabel} <ArrowRight01Icon />
        </Button>
      </div>
    </Section>
  )
}
