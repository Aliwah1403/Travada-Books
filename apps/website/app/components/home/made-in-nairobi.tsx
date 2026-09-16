import { Link } from "react-router"

import { Section } from "~/components/section"

export function MadeInNairobi() {
  return (
    <Section containerClassName="mx-auto max-w-[42rem] text-center">
      <h3 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
        Made in Nairobi, for the way business is done here.
      </h3>
      <div className="mx-auto mt-6 flex max-w-[55ch] flex-col gap-4 font-heading text-base/relaxed text-muted-foreground">
        <p>
          We're building this alongside the people who use it. Every feature exists because
          somebody running a real business told us it was missing.
        </p>
        <p>
          If something you need isn't here, tell us. There's a good chance it's already on the
          list — and if it isn't, it will be by Friday.
        </p>
      </div>
      <Link
        to="/about"
        className="fine-hover:text-foreground mt-6 inline-block text-sm text-primary underline underline-offset-4"
      >
        Our story →
      </Link>

      {/*
        Testimonials slot — deliberately deferred (see WEBSITE-PLAN.md §15
        and MEMORY.md "Business Decision Docs"): more features first, then
        marketing, then quotes from beta users. No fake testimonials.
        <TestimonialsRow items={TESTIMONIALS} />
      */}
    </Section>
  )
}
