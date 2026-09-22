import { cn } from "@travada-books/ui/lib/utils"

import { CtaBand } from "~/components/cta-band"
import { Container } from "~/components/container"
import { INTEGRATIONS } from "~/data/integrations"
import { pageMeta } from "~/lib/seo"

const INTEGRATION_GRID_BASE = "grid grid-cols-2 gap-px border border-[var(--website-line)] bg-[var(--website-line)] max-[640px]:grid-cols-1"
const INTEGRATION_GRID_COMING = "grid-cols-3 max-[900px]:grid-cols-2"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return pageMeta({
    title: "Integrations — Travada Books",
    description: "Connect Travada Books to Gmail and Outlook today, and see upcoming M-Pesa, Stripe and WhatsApp integrations.",
    path: "/integrations",
  })
}

export default function Integrations() {
  const available = INTEGRATIONS.filter((integration) => integration.status === "available")
  const comingSoon = INTEGRATIONS.filter((integration) => integration.status === "coming-soon")

  return (
    <>
      <section data-dark-surface className="relative overflow-hidden border-b border-[var(--website-line)] bg-[var(--website-paper)] pt-[8rem] pb-[7rem] text-[var(--website-ink)] max-[640px]:pt-[5rem] max-[640px]:pb-[5rem]">
        <div className="integrations-hero__grid" aria-hidden="true" />
        <Container className="relative max-w-7xl">
          <p className="flex items-center gap-[.65rem] text-[.64rem] font-semibold uppercase leading-none tracking-[.11em] text-[var(--website-green)] font-sans"><span className="h-px w-[1.8rem] bg-current" />Integrations</p>
          <h1 className="mt-[1.7rem] max-w-[64rem] text-[clamp(4rem,7.4vw,7.6rem)] leading-[.88] tracking-[-.077em] [font-weight:520]">Your tools should bring<br />the paperwork with them.</h1>
          <p className="mt-[2rem] max-w-[43rem] text-[1rem] leading-[1.7] text-[color-mix(in_oklab,var(--website-ink)_60%,transparent)] font-heading">Connect the inboxes you already use today. Payments and messaging integrations are next—and clearly marked until they are ready.</p>
        </Container>
      </section>

      <section data-dark-surface className="bg-[var(--website-paper)] pt-[7rem] pb-[9rem] text-[var(--website-ink)] max-[640px]:pt-[4rem] max-[640px]:pb-[6rem]">
        <Container className="max-w-7xl">
          <div className="grid grid-cols-[16rem_1fr] gap-[4rem] border-t border-[var(--website-line)] py-[3.5rem] last:border-b max-[900px]:grid-cols-1 max-[900px]:gap-[2rem]">
            <div>
              <span className="text-[var(--website-green)] font-sans text-[.58rem] font-semibold leading-none">01</span>
              <h2 className="mt-[1.5rem] text-[1.4rem] tracking-[-.04em] [font-weight:560]">Available now</h2>
              <p className="mt-[.75rem] text-[color-mix(in_oklab,var(--website-ink)_50%,transparent)] font-heading text-[.72rem] leading-[1.55]">Connect from Settings inside Travada Books.</p>
            </div>
            <div className={INTEGRATION_GRID_BASE}>
              {available.map(({ id, name, category, description, Icon }) => (
                <article key={id} className="min-h-[20rem] bg-[var(--website-paper)] p-[1.6rem] max-[640px]:min-h-[17rem]">
                  <div className="flex items-start justify-between"><Icon className="h-[2.1rem] w-[2.1rem]" /><span className="rounded-full border border-[var(--website-line)] px-[.55rem] py-[.34rem] font-sans text-[.48rem] leading-none font-semibold uppercase tracking-[.06em] text-[var(--website-green)]">Available</span></div>
                  <small className="mt-[4.5rem] block font-sans text-[.52rem] leading-none font-semibold uppercase tracking-[.08em] text-[color-mix(in_oklab,var(--website-ink)_45%,transparent)]">{category}</small>
                  <h3 className="mt-[.7rem] text-[1.35rem] tracking-[-.04em] [font-weight:570]">{name}</h3>
                  <p className="mt-[.8rem] text-[color-mix(in_oklab,var(--website-ink)_56%,transparent)] font-heading text-[.76rem] leading-[1.62]">{description}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[16rem_1fr] gap-[4rem] border-t border-[var(--website-line)] py-[3.5rem] last:border-b max-[900px]:grid-cols-1 max-[900px]:gap-[2rem]">
            <div>
              <span className="text-[var(--website-green)] font-sans text-[.58rem] font-semibold leading-none">02</span>
              <h2 className="mt-[1.5rem] text-[1.4rem] tracking-[-.04em] [font-weight:560]">Coming next</h2>
              <p className="mt-[.75rem] text-[color-mix(in_oklab,var(--website-ink)_50%,transparent)] font-heading text-[.72rem] leading-[1.55]">Published now so the roadmap stays visible and honest.</p>
            </div>
            <div className={cn(INTEGRATION_GRID_BASE, INTEGRATION_GRID_COMING)}>
              {comingSoon.map(({ id, name, category, description, Icon }) => (
                <article key={id} className="min-h-[20rem] bg-[var(--website-paper)] p-[1.6rem] opacity-[.65] max-[640px]:min-h-[17rem]">
                  <div className="flex items-start justify-between"><Icon className="h-[2.1rem] w-[2.1rem]" /><span className="rounded-full border border-[var(--website-line)] px-[.55rem] py-[.34rem] font-sans text-[.48rem] leading-none font-semibold uppercase tracking-[.06em] text-[var(--website-green)]">Coming soon</span></div>
                  <small className="mt-[4.5rem] block font-sans text-[.52rem] leading-none font-semibold uppercase tracking-[.08em] text-[color-mix(in_oklab,var(--website-ink)_45%,transparent)]">{category}</small>
                  <h3 className="mt-[.7rem] text-[1.35rem] tracking-[-.04em] [font-weight:570]">{name}</h3>
                  <p className="mt-[.8rem] text-[color-mix(in_oklab,var(--website-ink)_56%,transparent)] font-heading text-[.76rem] leading-[1.62]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <CtaBand heading="Connect the inbox. Clear the backlog." />
    </>
  )
}
