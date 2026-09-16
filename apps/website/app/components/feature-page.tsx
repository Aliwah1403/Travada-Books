import type { ReactNode } from "react"

import { Button } from "@travada-books/ui/components/button"
import { ArrowRight01Icon } from "@travada-books/ui/icons"

import { AppLink } from "~/components/app-link"
import { Container } from "~/components/container"
import { FeaturePreview, type FeatureVisual } from "~/components/feature-preview"

// Shared shell for the feature pages (/invoicing, /statement-import,
// /inbox) — see WEBSITE-PLAN.md §6 "Feature pages". Pain-led hero, 3–5
// alternating feature rows, then the caller adds <Faq items={...} /> and
// <CtaBand /> itself so each page keeps control of its own copy.

type FeatureHeroProps = {
  eyebrow: string
  title: string
  intro: string
}

export function FeatureHero({ eyebrow, title, intro }: FeatureHeroProps) {
  const heroVisual: FeatureVisual = eyebrow === "Invoicing" ? "recurring" : eyebrow === "Inbox" ? "matching" : "import"
  return (
    <section className="feature-hero">
      <div className="feature-hero__grid" aria-hidden="true" />
      <Container className="feature-hero__layout max-w-7xl">
        <div className="feature-hero__copy">
          <p className="section-kicker"><span />{eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
          <div className="feature-hero__actions">
            <Button size="lg" render={<AppLink to="signup" location="feature-hero" />}>
              Start free <ArrowRight01Icon />
            </Button>
            <small>No card required · Free during beta</small>
          </div>
        </div>
        <FeaturePreview visual={heroVisual} label={`${eyebrow} product preview`} />
      </Container>
    </section>
  )
}

export type FeatureRowItem = {
  title: string
  body: ReactNode
  screenshotLabel: string
  visual: FeatureVisual
}

type FeatureRowsProps = {
  items: FeatureRowItem[]
}

// Alternates text/screenshot side on md+ and the muted background band,
// index by index — same rhythm as the home page's section list.
export function FeatureRows({ items }: FeatureRowsProps) {
  return (
    <section className="feature-rows">
      <Container className="max-w-7xl">
      {items.map((item, index) => {
        const reverse = index % 2 === 1
        return (
          <article className={`feature-row ${reverse ? "feature-row--reverse" : ""}`} key={item.title}>
            <div className="feature-row__copy">
              <span>0{index + 1}</span>
              <div>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
              </div>
            </div>
            <FeaturePreview visual={item.visual} label={item.screenshotLabel} />
          </article>
        )
      })}
      </Container>
    </section>
  )
}
