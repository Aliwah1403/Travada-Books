import type { ReactNode } from "react"

import { buttonVariants } from "@travada-books/ui/components/button"
import { ArrowRight01Icon, CheckmarkCircle01Icon, type Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { AppLink } from "~/components/app-link"
import { ClosingCta, HomeFaq } from "~/components/home/closing"
import { Eyebrow } from "~/components/site/eyebrow"
import { FeatureItem } from "~/components/site/feature-item"
import { Section } from "~/components/site/section"
import { ShotPlaceholder } from "~/components/site/shot-placeholder"
import { Split } from "~/components/site/split"
import type { FaqItem } from "~/data/faq"

// One template for every feature page (WEBSITE-REDO-PLAN.md §4 "Feature
// pages"): hero split → framed screenshot → alternating rows → "Everything
// else" grid → page FAQ → the home closing CTA. Each route passes a typed
// content object; the route keeps its own meta() and JSON-LD.

export type FeatureRow = {
  /** Short mono label above the heading. */
  label: string
  icon: Icon
  title: string
  body: string
  /** What the screenshot beside the row will show. */
  screenshot: string
}

export type FeatureDetail = {
  title: string
  body: string
  icon: Icon
}

export type FeaturePageContent = {
  eyebrow: { label: string; icon: Icon }
  title: string
  lede: string
  /** Hero illustration (I3–I5, I9–I11), rendered with `labelsFrom="sm"`. */
  illustration: ReactNode
  /** The main screen, shown framed under the hero. */
  screenshot: string
  /** 3–4 rows. */
  rows: FeatureRow[]
  /** Exactly 4 items — the grid is 4 columns wide from lg. */
  details: FeatureDetail[]
  faq: { title: string; items: FaqItem[] }
}

function Hero({ content }: { content: FeaturePageContent }) {
  const { eyebrow } = content
  return (
    <Section flush>
      <Split
        center
        // Same shape as the home hero: stacked until lg so the illustration
        // keeps its callout size, then the illustration takes the wider column.
        className="md:grid-cols-1 lg:grid-cols-[5fr_7fr]"
        startClassName="md:border-r-0 md:border-b lg:border-r lg:border-b-0 md:py-24 lg:py-28"
        endClassName="lg:px-8"
        start={
          <div className="flex flex-col items-start">
            <Eyebrow icon={eyebrow.icon}>{eyebrow.label}</Eyebrow>
            <h1 className="mt-6 text-5xl font-medium tracking-tight text-balance md:text-6xl">{content.title}</h1>
            <p className="mt-6 max-w-xl text-lg text-pretty text-ink-muted">{content.lede}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <AppLink to="signup" location="feature-hero" className={cn(buttonVariants({ size: "lg" }), "text-sm")}>
                Start free <ArrowRight01Icon aria-hidden="true" />
              </AppLink>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-ink-subtle">
              <CheckmarkCircle01Icon className="size-4 text-brand-line" aria-hidden="true" />
              Free during beta · No card required
            </p>
          </div>
        }
        end={content.illustration}
      />
    </Section>
  )
}

function Rows({ rows }: { rows: FeatureRow[] }) {
  return (
    <>
      {rows.map((row, index) => (
        <Section key={row.title} flush>
          <Split
            center
            reverse={index % 2 === 1}
            start={
              <div className="flex flex-col items-start">
                <Eyebrow icon={row.icon}>{row.label}</Eyebrow>
                <h2 className="mt-5 text-3xl font-medium tracking-tight text-balance md:text-4xl">{row.title}</h2>
                <p className="mt-4 max-w-lg text-lg text-pretty text-ink-muted">{row.body}</p>
              </div>
            }
            end={<ShotPlaceholder label={row.screenshot} ratio="4/3" />}
          />
        </Section>
      ))}
    </>
  )
}

function Details({ details }: { details: FeatureDetail[] }) {
  return (
    <Section size="lg">
      <div className="flex max-w-2xl flex-col gap-4">
        <Eyebrow>Everything else</Eyebrow>
        <h2 className="text-3xl font-medium tracking-tight text-balance md:text-4xl">
          The details that keep the workflow moving.
        </h2>
      </div>
      <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 md:mt-16 lg:grid-cols-4">
        {details.map((detail) => (
          <FeatureItem key={detail.title} icon={detail.icon} title={detail.title} className="bg-panel p-6">
            {detail.body}
          </FeatureItem>
        ))}
      </div>
    </Section>
  )
}

export function FeaturePage({ content }: { content: FeaturePageContent }) {
  return (
    <>
      <Hero content={content} />
      <Section size="md" tone="canvas">
        <ShotPlaceholder label={content.screenshot} ratio="16/9" />
      </Section>
      <Rows rows={content.rows} />
      <Details details={content.details} />
      <HomeFaq items={content.faq.items} title={content.faq.title} />
      <ClosingCta />
    </>
  )
}
