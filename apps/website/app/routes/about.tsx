import { Link } from "react-router"

import { ArrowRight01Icon } from "@travada-books/ui/icons"
import { CtaBand } from "~/components/cta-band"
import { Container } from "~/components/container"
import { CONTACT_EMAIL } from "~/data/site"
import { organizationJsonLd, pageMeta } from "~/lib/seo"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return [
    ...pageMeta({
      title: "About Travada Books — Built in Nairobi for Kenyan Businesses",
      description:
        "Travada Books is invoicing and bookkeeping software built by Travada Systems in Nairobi. We were our own first customer and build alongside Kenyan businesses.",
      path: "/about",
      image: "/og/about.png",
    }),
    organizationJsonLd(),
  ]
}

export default function About() {
  return (
    <>
      <section data-dark-surface className="relative overflow-hidden bg-[var(--website-paper)] pt-[7.5rem] pb-[6rem] text-[var(--website-ink)] max-[640px]:pt-[5rem] max-[640px]:pb-[5rem]">
        <div className="about-hero__grid" aria-hidden="true" />
        <Container className="relative grid grid-cols-[1.15fr_.85fr] items-center gap-[6rem] max-w-7xl max-[900px]:grid-cols-1">
          <div>
            <p className="flex items-center gap-[.65rem] text-[.64rem] font-semibold uppercase leading-none tracking-[.11em] text-[var(--website-green)] font-sans"><span className="h-px w-[1.8rem] bg-current" />About Travada Books</p>
            <h1 className="mt-[1.7rem] text-[clamp(3.8rem,7vw,7.3rem)] leading-[.88] tracking-[-.075em] [font-weight:520]">We were our own<br /><em className="not-italic text-[var(--website-green)]">first customer.</em></h1>
            <p className="mt-[2rem] max-w-[38rem] text-[1rem] leading-[1.7] text-[color-mix(in_oklab,var(--website-ink)_60%,transparent)] font-heading">Travada Books is invoicing and bookkeeping software built by Travada Systems in Nairobi for the businesses that keep Kenya moving.</p>
          </div>
          <div
            aria-hidden="true"
            className="relative grid aspect-square place-items-center rounded-full border border-[var(--website-line)] bg-[color-mix(in_oklab,var(--website-paper)_87%,transparent)] before:absolute before:content-[''] before:[inset:1.2rem] before:rounded-full before:border before:border-dashed before:border-[var(--website-line)] max-[900px]:mx-auto max-[900px]:w-[min(30rem,80vw)]"
          >
            <span className="text-center font-heading text-[clamp(1.4rem,3vw,2.8rem)] leading-[.85] tracking-[-.06em] text-[var(--website-ink)] [font-weight:650]">TRAVADA<br />SYSTEMS</span>
            <svg viewBox="0 0 300 300" className="absolute inset-[10%] h-[80%] w-[80%] opacity-75">
              <circle className="fill-none stroke-[var(--website-line)] stroke-1" cx="150" cy="150" r="115" />
              <circle className="fill-none stroke-[var(--website-line)] stroke-1" cx="150" cy="150" r="72" />
              <path className="fill-none stroke-[var(--website-line)] stroke-1" d="M150 22v256M22 150h256" />
            </svg>
            <p className="absolute bottom-[18%] text-center font-sans text-[.5rem] leading-[1.5] font-semibold tracking-[.1em] text-[var(--website-green)]">EST. 2026<br />NAIROBI, KENYA</p>
          </div>
        </Container>
      </section>

      <section data-dark-surface className="bg-[var(--website-paper)] py-[8rem] text-[var(--website-ink)] max-[640px]:py-[5rem]">
        <Container className="max-w-7xl">
          <div className="grid grid-cols-[9rem_minmax(0,48rem)] gap-[4rem] max-[640px]:grid-cols-1 max-[640px]:gap-[1.5rem]">
            <span className="text-[var(--website-green)] font-sans text-[.6rem] font-semibold leading-none tracking-[.1em]">THE ORIGIN</span>
            <h2 className="text-[clamp(2.6rem,5vw,5.2rem)] leading-[.95] tracking-[-.068em] [font-weight:520]">A tool born from a real invoice that still needed chasing.</h2>
          </div>
          <div className="mt-[5rem] grid grid-cols-3 border border-[var(--website-line)] max-[900px]:grid-cols-1">
            <article className="min-h-[25rem] border-r border-[var(--website-line)] p-[2rem] last:border-r-0 max-[900px]:min-h-[18rem] max-[900px]:border-r-0 max-[900px]:border-b max-[900px]:last:border-b-0">
              <span className="text-[var(--website-green)] font-sans text-[.55rem] font-semibold leading-none tracking-[.08em]">01 / THE PROBLEM</span>
              <h3 className="mt-[8rem] text-[1.25rem] leading-[1.1] tracking-[-.035em] [font-weight:560] max-[900px]:mt-[4rem]">Our own books were getting in the way.</h3>
              <p className="mt-[1.2rem] text-[color-mix(in_oklab,var(--website-ink)_56%,transparent)] font-heading text-[.82rem] leading-[1.65]">Invoicing Travada Systems customers meant rebuilding the same documents, sending them by hand, and trying to remember who still owed what.</p>
            </article>
            <article className="min-h-[25rem] border-r border-[var(--website-line)] p-[2rem] last:border-r-0 max-[900px]:min-h-[18rem] max-[900px]:border-r-0 max-[900px]:border-b max-[900px]:last:border-b-0">
              <span className="text-[var(--website-green)] font-sans text-[.55rem] font-semibold leading-none tracking-[.08em]">02 / THE SIGNAL</span>
              <h3 className="mt-[8rem] text-[1.25rem] leading-[1.1] tracking-[-.035em] [font-weight:560] max-[900px]:mt-[4rem]">Then another business described the same headache.</h3>
              <p className="mt-[1.2rem] text-[color-mix(in_oklab,var(--website-ink)_56%,transparent)] font-heading text-[.82rem] leading-[1.65]">An agent was struggling to invoice his clients in exactly the same way. Two businesses, one recurring problem: the workflow was broken, not the people.</p>
            </article>
            <article className="min-h-[25rem] border-r border-[var(--website-line)] p-[2rem] last:border-r-0 max-[900px]:min-h-[18rem] max-[900px]:border-r-0 max-[900px]:border-b max-[900px]:last:border-b-0">
              <span className="text-[var(--website-green)] font-sans text-[.55rem] font-semibold leading-none tracking-[.08em]">03 / THE PRODUCT</span>
              <h3 className="mt-[8rem] text-[1.25rem] leading-[1.1] tracking-[-.035em] [font-weight:560] max-[900px]:mt-[4rem]">So we built the system we wanted to use.</h3>
              <p className="mt-[1.2rem] text-[color-mix(in_oklab,var(--website-ink)_56%,transparent)] font-heading text-[.82rem] leading-[1.65]">Travada Books now runs our own invoicing and bookkeeping. We build each feature alongside people operating real Kenyan businesses.</p>
            </article>
          </div>
        </Container>
      </section>

      <section className="bg-[#1d211d] py-[8rem] text-[#f4f5ed] max-[640px]:py-[5rem]">
        <Container className="max-w-7xl">
          <div className="flex items-end justify-between gap-[2rem] max-[640px]:block">
            <p className="flex items-center gap-[.65rem] text-[.64rem] font-semibold uppercase leading-none tracking-[.11em] text-[#dafa4d] font-sans"><span className="h-px w-[1.8rem] bg-current" />How we build</p>
            <h2 className="text-right text-[clamp(3rem,5.5vw,5.6rem)] leading-[.91] tracking-[-.07em] [font-weight:520] max-[640px]:mt-[1.5rem] max-[640px]:text-left">Kenya first.<br />Business owners first.</h2>
          </div>
          <div className="mt-[5rem] grid grid-cols-2 border border-[#414840] max-[640px]:grid-cols-1">
            <article className="min-h-[18rem] border-r border-b border-[#414840] p-[2rem] [&:nth-child(2n)]:border-r-0 min-[641px]:[&:nth-last-child(-n+2)]:border-b-0 max-[640px]:border-r-0 max-[640px]:last:border-b-0">
              <span className="text-[var(--website-green)] font-sans text-[.55rem] font-semibold leading-none tracking-[.08em]">01</span>
              <h3 className="mt-[4rem] text-[1.2rem] tracking-[-.03em] [font-weight:560]">Built from the work</h3>
              <p className="mt-[1rem] max-w-[32rem] text-[#aeb5ac] font-heading text-[.82rem] leading-[1.7]">Every feature starts with a real workflow: a late invoice, a statement that will not import cleanly, or a receipt lost in email.</p>
            </article>
            <article className="min-h-[18rem] border-r border-b border-[#414840] p-[2rem] [&:nth-child(2n)]:border-r-0 min-[641px]:[&:nth-last-child(-n+2)]:border-b-0 max-[640px]:border-r-0 max-[640px]:last:border-b-0">
              <span className="text-[var(--website-green)] font-sans text-[.55rem] font-semibold leading-none tracking-[.08em]">02</span>
              <h3 className="mt-[4rem] text-[1.2rem] tracking-[-.03em] [font-weight:560]">Clear over clever</h3>
              <p className="mt-[1rem] max-w-[32rem] text-[#aeb5ac] font-heading text-[.82rem] leading-[1.7]">You should not need accounting knowledge to know who has paid you, what you spent, or what needs attention.</p>
            </article>
            <article className="min-h-[18rem] border-r border-b border-[#414840] p-[2rem] [&:nth-child(2n)]:border-r-0 min-[641px]:[&:nth-last-child(-n+2)]:border-b-0 max-[640px]:border-r-0 max-[640px]:last:border-b-0">
              <span className="text-[var(--website-green)] font-sans text-[.55rem] font-semibold leading-none tracking-[.08em]">03</span>
              <h3 className="mt-[4rem] text-[1.2rem] tracking-[-.03em] [font-weight:560]">Local by design</h3>
              <p className="mt-[1rem] max-w-[32rem] text-[#aeb5ac] font-heading text-[.82rem] leading-[1.7]">M-Pesa, shillings, foreign-currency clients, and the shape of local bank statements are core product decisions—not regional add-ons.</p>
            </article>
            <article className="min-h-[18rem] border-r border-b border-[#414840] p-[2rem] [&:nth-child(2n)]:border-r-0 min-[641px]:[&:nth-last-child(-n+2)]:border-b-0 max-[640px]:border-r-0 max-[640px]:last:border-b-0">
              <span className="text-[var(--website-green)] font-sans text-[.55rem] font-semibold leading-none tracking-[.08em]">04</span>
              <h3 className="mt-[4rem] text-[1.2rem] tracking-[-.03em] [font-weight:560]">Open about progress</h3>
              <p className="mt-[1rem] max-w-[32rem] text-[#aeb5ac] font-heading text-[.82rem] leading-[1.7]">We publish what ships in <Link to="/updates" className="text-[#dafa4d] underline underline-offset-[.2rem]">Updates</Link>, and we say plainly when something such as eTIMS support is still coming.</p>
            </article>
          </div>
        </Container>
      </section>

      <section data-dark-surface className="border-b border-[var(--website-line)] bg-[var(--website-paper)] text-[var(--website-ink)]">
        <Container className="flex items-end justify-between gap-[2rem] py-[5rem] max-w-7xl max-[640px]:flex-col max-[640px]:items-start">
          <div>
            <span className="text-[var(--website-green)] font-sans text-[.56rem] font-semibold leading-none tracking-[.1em]">HAVE A WORKFLOW WE SHOULD SEE?</span>
            <h2 className="mt-[1rem] text-[clamp(2.5rem,5vw,5rem)] leading-none tracking-[-.065em] [font-weight:520]">Build it with us.</h2>
          </div>
          <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-[.6rem] border-b border-current pb-[.35rem] text-[var(--website-green)] font-sans text-[.7rem] font-semibold leading-none">{CONTACT_EMAIL} <ArrowRight01Icon className="w-[.9rem]" /></a>
        </Container>
      </section>

      <CtaBand heading="Built here. Ready for your business." />
    </>
  )
}
