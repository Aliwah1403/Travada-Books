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
      <section className="about-hero">
        <div className="about-hero__grid" aria-hidden="true" />
        <Container className="about-hero__layout max-w-7xl">
          <div>
            <p className="section-kicker"><span />About Travada Books</p>
            <h1>We were our own<br /><em>first customer.</em></h1>
            <p>Travada Books is invoicing and bookkeeping software built by Travada Systems in Nairobi for the businesses that keep Kenya moving.</p>
          </div>
          <div className="about-hero__stamp" aria-hidden="true">
            <span>TRAVADA<br />SYSTEMS</span>
            <svg viewBox="0 0 300 300"><circle cx="150" cy="150" r="115" /><circle cx="150" cy="150" r="72" /><path d="M150 22v256M22 150h256" /></svg>
            <p>EST. 2026<br />NAIROBI, KENYA</p>
          </div>
        </Container>
      </section>

      <section className="origin-story">
        <Container className="max-w-7xl">
          <div className="origin-story__lead"><span>THE ORIGIN</span><h2>A tool born from a real invoice that still needed chasing.</h2></div>
          <div className="origin-story__timeline">
            <article><span>01 / THE PROBLEM</span><h3>Our own books were getting in the way.</h3><p>Invoicing Travada Systems customers meant rebuilding the same documents, sending them by hand, and trying to remember who still owed what.</p></article>
            <article><span>02 / THE SIGNAL</span><h3>Then another business described the same headache.</h3><p>An agent was struggling to invoice his clients in exactly the same way. Two businesses, one recurring problem: the workflow was broken, not the people.</p></article>
            <article><span>03 / THE PRODUCT</span><h3>So we built the system we wanted to use.</h3><p>Travada Books now runs our own invoicing and bookkeeping. We build each feature alongside people operating real Kenyan businesses.</p></article>
          </div>
        </Container>
      </section>

      <section className="building-principles">
        <Container className="max-w-7xl">
          <div className="building-principles__intro"><p className="section-kicker"><span />How we build</p><h2>Kenya first.<br />Business owners first.</h2></div>
          <div className="building-principles__grid">
            <article><span>01</span><h3>Built from the work</h3><p>Every feature starts with a real workflow: a late invoice, a statement that will not import cleanly, or a receipt lost in email.</p></article>
            <article><span>02</span><h3>Clear over clever</h3><p>You should not need accounting knowledge to know who has paid you, what you spent, or what needs attention.</p></article>
            <article><span>03</span><h3>Local by design</h3><p>M-Pesa, shillings, foreign-currency clients, and the shape of local bank statements are core product decisions—not regional add-ons.</p></article>
            <article><span>04</span><h3>Open about progress</h3><p>We publish what ships in <Link to="/updates">Updates</Link>, and we say plainly when something such as eTIMS support is still coming.</p></article>
          </div>
        </Container>
      </section>

      <section className="about-contact">
        <Container className="about-contact__inner max-w-7xl"><div><span>HAVE A WORKFLOW WE SHOULD SEE?</span><h2>Build it with us.</h2></div><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL} <ArrowRight01Icon /></a></Container>
      </section>

      <CtaBand heading="Built here. Ready for your business." />
    </>
  )
}
