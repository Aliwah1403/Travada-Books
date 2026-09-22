import { Link } from "react-router"

import { ArrowRight01Icon, GridIcon, User02Icon, UserIcon, UserStar01Icon, Wallet01Icon } from "@travada-books/ui/icons"
import { CtaBand } from "~/components/cta-band"
import { Container } from "~/components/container"
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

export default function WhoItsFor() {
  const icons = [UserIcon, UserStar01Icon, Wallet01Icon, GridIcon, User02Icon]
  return (
    <>
      <section data-dark-surface className="relative overflow-hidden bg-[var(--website-paper)] pt-[7.5rem] pb-[6rem] text-[var(--website-ink)] max-[640px]:pt-[5rem] max-[640px]:pb-[5rem]">
        <div className="audience-hero__grid" aria-hidden="true" />
        <Container className="relative max-w-7xl">
          <p className="flex items-center gap-[.65rem] text-[.64rem] font-semibold uppercase leading-none tracking-[.11em] text-[var(--website-green)] font-sans"><span className="h-px w-[1.8rem] bg-current" />Who it’s for</p>
          <h1 className="mt-[1.8rem] max-w-[72rem] text-[clamp(4rem,8.5vw,8.7rem)] leading-[.84] tracking-[-.078em] [font-weight:520]">Built for the person<br />doing <em className="not-italic text-[var(--website-green)]">everything.</em></h1>
          <div className="mt-[3rem] grid grid-cols-[minmax(0,38rem)_auto] items-end justify-between gap-[3rem] border-t border-[var(--website-line)] pt-[1.5rem] max-[640px]:grid-cols-1 max-[640px]:gap-[1.5rem]">
            <p className="text-[color-mix(in_oklab,var(--website-ink)_62%,transparent)] font-heading text-[1rem] leading-[1.7]">Travada Books is invoicing and bookkeeping software for freelancers, consultants, agencies, and small businesses in Kenya—the people doing the work and keeping the business moving.</p>
            <span className="text-[color-mix(in_oklab,var(--website-ink)_40%,transparent)] font-sans text-[.56rem] font-semibold leading-none tracking-[.1em]">01°17′S · NAIROBI, KE</span>
          </div>
        </Container>
      </section>

      <section data-dark-surface className="bg-[var(--website-paper)] pt-[3rem] pb-[8rem] text-[var(--website-ink)]">
        <Container className="max-w-7xl">
          {PERSONAS.map((persona, index) => {
            const Icon = icons[index]
            return (
              <article
                key={persona.id}
                className="grid grid-cols-[8rem_.85fr_1.15fr] gap-[3rem] min-h-[22rem] border-t border-[var(--website-line)] py-[3.5rem] last:border-b last:border-[var(--website-line)] max-[900px]:grid-cols-[4rem_1fr] max-[640px]:grid-cols-1 max-[640px]:gap-[2rem]"
              >
                <div className="flex flex-col justify-between text-[var(--website-green)] font-sans text-[.62rem] font-semibold leading-none max-[640px]:flex-row">
                  <span>0{index + 1}</span><Icon className="h-[2rem] w-[2rem] text-[color-mix(in_oklab,var(--website-ink)_40%,transparent)]" />
                </div>
                <div>
                  <h2 className="text-[clamp(2rem,3.8vw,3.8rem)] leading-[.96] tracking-[-.06em] [font-weight:520]">{persona.title}</h2>
                  <p className="mt-[1.25rem] max-w-[26rem] text-[color-mix(in_oklab,var(--website-ink)_56%,transparent)] font-heading text-[.95rem] leading-[1.65] italic">{persona.body}</p>
                </div>
                <div className="flex flex-col justify-between border-l border-[var(--website-line)] pl-[3rem] max-[900px]:col-start-2 max-[900px]:border-l-0 max-[900px]:pl-0 max-[640px]:col-auto">
                  <p className="max-w-[34rem] text-[color-mix(in_oklab,var(--website-ink)_67%,transparent)] font-heading text-[.93rem] leading-[1.75]">{persona.detail}</p>
                  <Link to={persona.linkHref} className="inline-flex w-max items-center gap-[.5rem] text-[var(--website-green)] font-sans text-[.66rem] font-semibold leading-none max-[900px]:mt-[2rem]">{persona.linkLabel} <ArrowRight01Icon className="w-[.85rem]" /></Link>
                </div>
              </article>
            )
          })}
        </Container>
      </section>

      <CtaBand heading="Less admin. More of the work you're actually good at." />
    </>
  )
}
