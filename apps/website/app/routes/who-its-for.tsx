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
      <section className="audience-hero">
        <div className="audience-hero__grid" aria-hidden="true" />
        <Container className="relative max-w-7xl">
          <p className="section-kicker"><span />Who it’s for</p>
          <h1>Built for the person<br />doing <em>everything.</em></h1>
          <div className="audience-hero__intro">
            <p>Travada Books is invoicing and bookkeeping software for freelancers, consultants, agencies, and small businesses in Kenya—the people doing the work and keeping the business moving.</p>
            <span>01°17′S · NAIROBI, KE</span>
          </div>
        </Container>
      </section>

      <section className="persona-list">
        <Container className="max-w-7xl">
          {PERSONAS.map((persona, index) => {
            const Icon = icons[index]
            return (
              <article key={persona.id} className="persona-row">
                <div className="persona-row__index"><span>0{index + 1}</span><Icon /></div>
                <div className="persona-row__title"><h2>{persona.title}</h2><p>{persona.body}</p></div>
                <div className="persona-row__detail"><p>{persona.detail}</p><Link to={persona.linkHref}>{persona.linkLabel} <ArrowRight01Icon /></Link></div>
              </article>
            )
          })}
        </Container>
      </section>

      <CtaBand heading="Less admin. More of the work you're actually good at." />
    </>
  )
}
