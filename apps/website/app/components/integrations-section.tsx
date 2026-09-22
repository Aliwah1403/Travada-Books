import { Link } from "react-router"

import { ArrowRight01Icon } from "@travada-books/ui/icons"

import { Container } from "~/components/container"
import { INTEGRATIONS } from "~/data/integrations"

type IntegrationsSectionProps = {
  compact?: boolean
}

export function IntegrationsSection({ compact = false }: IntegrationsSectionProps) {
  return (
    <section className={`integrations-strip ${compact ? "integrations-strip--compact" : ""}`}>
      <Container className="max-w-7xl">
        <div className="integrations-strip__heading">
          <div>
            <p className="section-kicker"><span />Integrations</p>
            <h2>Works with the places<br />your paperwork already lives.</h2>
          </div>
          <Link to="/integrations">View all integrations <ArrowRight01Icon /></Link>
        </div>
        <div className="integrations-strip__list">
          {INTEGRATIONS.map(({ id, name, status, Icon }) => (
            <article key={id} className={status === "coming-soon" ? "is-coming" : ""}>
              <Icon />
              <div><strong>{name}</strong><span>{status === "available" ? "Available" : "Coming soon"}</span></div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
