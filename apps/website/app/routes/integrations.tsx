import { CtaBand } from "~/components/cta-band"
import { Container } from "~/components/container"
import { INTEGRATIONS } from "~/data/integrations"
import { pageMeta } from "~/lib/seo"

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
      <section className="integrations-hero">
        <div className="integrations-hero__grid" aria-hidden="true" />
        <Container className="relative max-w-7xl">
          <p className="section-kicker"><span />Integrations</p>
          <h1>Your tools should bring<br />the paperwork with them.</h1>
          <p>Connect the inboxes you already use today. Payments and messaging integrations are next—and clearly marked until they are ready.</p>
        </Container>
      </section>

      <section className="integration-catalogue">
        <Container className="max-w-7xl">
          <div className="integration-group">
            <div className="integration-group__label"><span>01</span><h2>Available now</h2><p>Connect from Settings inside Travada Books.</p></div>
            <div className="integration-grid">
              {available.map(({ id, name, category, description, Icon }) => (
                <article key={id}>
                  <div className="integration-card__top"><Icon /><span>Available</span></div>
                  <small>{category}</small>
                  <h3>{name}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="integration-group">
            <div className="integration-group__label"><span>02</span><h2>Coming next</h2><p>Published now so the roadmap stays visible and honest.</p></div>
            <div className="integration-grid integration-grid--coming">
              {comingSoon.map(({ id, name, category, description, Icon }) => (
                <article key={id}>
                  <div className="integration-card__top"><Icon /><span>Coming soon</span></div>
                  <small>{category}</small>
                  <h3>{name}</h3>
                  <p>{description}</p>
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
