import type { ReactNode } from "react"

import { Button } from "@travada-books/ui/components/button"
import { ArrowRight01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

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
  const heroVisual: FeatureVisual = eyebrow === "Invoicing" ? "payments" : eyebrow === "Inbox" ? "providers" : "categories"
  return (
    <section data-dark-surface className="relative overflow-hidden bg-[var(--website-paper)] py-[6.5rem] text-[var(--website-ink)] max-[640px]:py-[4.5rem]">
      <div className="feature-hero__grid" aria-hidden="true" />
      <Container data-hero-preview className="relative grid grid-cols-[.85fr_1.15fr] items-center gap-[clamp(3rem,7vw,7rem)] max-w-7xl max-[900px]:grid-cols-1">
        <div className="max-[900px]:max-w-[42rem]">
          <p className="flex items-center gap-[.65rem] text-[.64rem] font-semibold uppercase leading-none tracking-[.11em] text-[var(--website-green)] font-sans"><span className="h-px w-[1.8rem] bg-current" />{eyebrow}</p>
          <h1 className="mt-[1.4rem] max-w-[40rem] text-[clamp(3.1rem,5.9vw,6.2rem)] leading-[.91] tracking-[-.073em] [font-weight:520]">{title}</h1>
          <p className="mt-[1.7rem] max-w-[36rem] text-[1rem] leading-[1.7] text-[color-mix(in_oklab,var(--website-ink)_60%,transparent)] font-heading">{intro}</p>
          <div className="mt-[2rem] flex items-center gap-[1rem] max-[640px]:flex-col max-[640px]:items-start">
            <Button
              size="lg"
              className="rounded-[.5rem] bg-[var(--website-ink)] px-[1.25rem] text-[var(--website-paper)]"
              render={<AppLink to="signup" location="feature-hero" />}
            >
              Start free <ArrowRight01Icon />
            </Button>
            <small className="font-sans text-[.6rem] leading-[1.35] font-medium text-[color-mix(in_oklab,var(--website-ink)_48%,transparent)]">No card required · Free during beta</small>
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

const ESSENTIALS_GRID_BASE = cn(
  "mt-[4rem] grid grid-cols-3 border border-[var(--website-line)]",
  "max-[900px]:grid-cols-2 max-[640px]:mt-[3rem] max-[640px]:grid-cols-1",
)
const ESSENTIALS_GRID_TWO = "grid-cols-2"
const ESSENTIALS_ARTICLE = cn(
  "min-h-[18rem] border-r border-[var(--website-line)] p-[1.6rem] last:border-r-0",
  "max-[900px]:[&:nth-child(2)]:border-r-0 max-[900px]:[&:nth-child(n+3)]:border-t max-[900px]:border-[var(--website-line)]",
  "max-[640px]:min-h-[15rem] max-[640px]:border-r-0 max-[640px]:border-b max-[640px]:last:border-b-0",
)

// Alternates text/screenshot side on md+ and the muted background band,
// index by index — same rhythm as the home page's section list.
export function FeatureRows({ items }: FeatureRowsProps) {
  const demonstrations = items.slice(0, 2)
  const essentials = items.slice(2)

  return (
    <section data-dark-surface className="bg-[var(--website-paper)] pt-[2rem] pb-[8rem] text-[var(--website-ink)]">
      <Container className="max-w-7xl">
      {demonstrations.map((item, index) => {
        const reverse = index % 2 === 1
        return (
          <article
            data-row-preview
            data-reverse={reverse || undefined}
            className={cn(
              "grid min-h-[35rem] border border-b-0 border-[var(--website-line)] last:border-b max-[900px]:grid-cols-1",
              reverse ? "grid-cols-[1.15fr_.85fr]" : "grid-cols-[.85fr_1.15fr]",
            )}
            key={item.title}
          >
            <div className={cn("grid grid-cols-[2.5rem_1fr] gap-[1.2rem] p-[clamp(2rem,5vw,4.5rem)] max-[640px]:min-h-[25rem] max-[640px]:grid-cols-1", reverse && "order-2 max-[900px]:order-none")}>
              <span className="text-[var(--website-green)] font-sans text-[.62rem] font-semibold leading-none">0{index + 1}</span>
              <div>
                <h2 className="max-w-[27rem] text-[clamp(2rem,3.7vw,3.8rem)] leading-[.98] tracking-[-.06em] [font-weight:520]">{item.title}</h2>
                <p className="mt-[1.4rem] max-w-[31rem] text-[.9rem] leading-[1.7] text-[color-mix(in_oklab,var(--website-ink)_58%,transparent)] font-heading">{item.body}</p>
              </div>
            </div>
            <FeaturePreview visual={item.visual} label={item.screenshotLabel} />
          </article>
        )
      })}
      {essentials.length > 0 && (
        <div className="pt-[7rem] max-[640px]:pt-[5rem]">
          <div className="flex items-end justify-between gap-[3rem] max-[640px]:block">
            <p className="flex items-center gap-[.65rem] text-[.64rem] font-semibold uppercase leading-none tracking-[.11em] text-[var(--website-green)] font-sans"><span className="h-px w-[1.8rem] bg-current" />Also included</p>
            <h2 className="max-w-[39rem] text-right text-[clamp(2.5rem,4.7vw,4.7rem)] leading-[.98] tracking-[-.065em] [font-weight:520] max-[640px]:mt-[1.5rem] max-[640px]:text-left">The details that keep<br />the workflow moving.</h2>
          </div>
          <div className={cn(ESSENTIALS_GRID_BASE, essentials.length === 2 && ESSENTIALS_GRID_TWO)}>
            {essentials.map((item, index) => (
              <article className={ESSENTIALS_ARTICLE} key={item.title}>
                <span className="text-[var(--website-green)] font-sans text-[.58rem] font-semibold leading-none">0{index + 3}</span>
                <h3 className="mt-[4rem] text-[1.15rem] tracking-[-.035em] [font-weight:570]">{item.title}</h3>
                <p className="mt-[1rem] text-[.78rem] leading-[1.62] text-[color-mix(in_oklab,var(--website-ink)_57%,transparent)] font-heading">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      )}
      </Container>
    </section>
  )
}
