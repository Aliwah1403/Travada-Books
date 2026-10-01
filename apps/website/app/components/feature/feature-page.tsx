import type { ReactNode } from "react"

import { buttonVariants } from "@travada-books/ui/components/button"
import { ArrowRight01Icon, CheckmarkCircle01Icon, type Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { AppLink } from "~/components/app-link"
import { HATCH } from "~/components/feature/hatch"
import { ClosingCta, HomeFaq } from "~/components/home/closing"
import { Eyebrow } from "~/components/site/eyebrow"
import { FeatureItem } from "~/components/site/feature-item"
import { Section } from "~/components/site/section"
import { ShotPlaceholder } from "~/components/site/shot-placeholder"
import { Split } from "~/components/site/split"
import type { FaqItem } from "~/data/faq"
import { ARROW_NUDGE } from "~/components/home/shared"

// One template for every feature page (WEBSITE-REDO-PLAN.md §4 "Feature
// pages"): hero → alternating rows → "Everything else" grid → page FAQ →
// the home closing CTA. Each route passes a typed content object; the route
// keeps its own meta() and JSON-LD.
//
// Hero layouts (all share eyebrow, h1, lede, CTA):
// - "illustration" (default): split, iso illustration on the right, then a
//   framed main-screen placeholder under the hero.
// - "tilted-shot": centred copy with a large screenshot below it, tilted
//   back in perspective and fading into the section (Linear/Tailark), over
//   a faint hatched texture. With `shot.sidebar` set, md+ cuts the one
//   full-app screenshot into two layers (sidebar behind, main content
//   floating above it). The screenshot is the main screen, so there is no
//   separate framed section.
// - "split-shot": copy left; on the right a screenshot (or any visual) over
//   the hatch, bleeding past the frame's right rail to the viewport edge,
//   where the section clips it. Stacked below lg, still bleeding right.
// - "floating": centred copy with a few small coded fragments of real UI
//   below it, offset and overlapping over the hatch, telling one short
//   story. Static apart from the mockups' one-time entrance.

/** A product screenshot slot. Without `src` it renders a captioned
 *  placeholder; with `src` the image. `caption` always says what the real
 *  screenshot must show, for whoever captures it. */
export type FeatureShot = {
  src?: string
  alt: string
  caption: string
  /** Intrinsic size of `src`, to reserve space and avoid layout shift. */
  width?: number
  height?: number
  /** Share of the screenshot's width taken by the app sidebar (0–1). When
   *  set on a tilted hero shot, the one full-app screenshot is cut into two
   *  layers — the sidebar behind, the main content area floating above it. */
  sidebar?: number
}

export type FeatureRow = {
  /** Short mono label above the heading. */
  label: string
  icon: Icon
  title: string
  body: string
  /** What the screenshot beside the row will show (captioned placeholder). */
  screenshot?: string
  /** A screenshot slot — takes precedence over `screenshot`. */
  shot?: FeatureShot
  /** Any visual (e.g. a coded mockup) — takes precedence over both. */
  visual?: ReactNode
}

export type FeatureDetail = {
  title: string
  body: string
  icon: Icon
}

type FeaturePageBase = {
  eyebrow: { label: string; icon: Icon }
  title: string
  lede: string
  /** 3–4 rows. */
  rows: FeatureRow[]
  /** Exactly 4 items — the grid is 4 columns wide from lg. */
  details: FeatureDetail[]
  faq: { title: string; items: FaqItem[] }
}

type IllustrationHero = {
  heroLayout?: "illustration"
  /** Hero illustration (I3–I5, I9–I11), rendered with `labelsFrom="sm"`. */
  illustration: ReactNode
  /** The main screen, shown framed under the hero. */
  screenshot: string
}

type TiltedShotHero = {
  heroLayout: "tilted-shot"
  /** The main screen, shown tilted under the centred hero copy. */
  shot: FeatureShot
}

type SplitShotHero = {
  heroLayout: "split-shot"
} & (
  | {
      /** A screenshot, shown large and running off the right edge. */
      shot: FeatureShot
      visual?: never
    }
  | {
      /** Any visual (e.g. a coded mockup). It gets the whole stage, from
       *  the column's hairline to the viewport edge, and is clipped there. */
      visual: ReactNode
      shot?: never
    }
)

type FloatingHero = {
  heroLayout: "floating"
  /** Coded fragments under the centred copy (see mockups/primitives
   *  `MockFragments`). */
  visual: ReactNode
}

export type FeaturePageContent = FeaturePageBase & (IllustrationHero | TiltedShotHero | SplitShotHero | FloatingHero)

// Image when there is a `src`, captioned placeholder otherwise. Same chrome
// as ShotPlaceholder so swapping one for the other doesn't shift the layout.
function Shot({ shot, ratio, priority = false }: { shot: FeatureShot; ratio: string; priority?: boolean }) {
  if (!shot.src) return <ShotPlaceholder label={shot.caption} ratio={ratio} />
  return (
    <div className="border border-line bg-panel p-1.5">
      <img
        src={shot.src}
        alt={shot.alt}
        width={shot.width}
        height={shot.height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className="block h-auto w-full border border-line bg-canvas"
      />
    </div>
  )
}

function HeroCta() {
  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <AppLink to="signup" location="feature-hero" className={cn(buttonVariants({ size: "lg" }), "text-sm", ARROW_NUDGE)}>
          Start free <ArrowRight01Icon aria-hidden="true" />
        </AppLink>
      </div>
      <p className="mt-5 flex items-center gap-2 text-sm text-ink-subtle">
        <CheckmarkCircle01Icon className="size-4 text-brand-line" aria-hidden="true" />
        Free during beta · No card required
      </p>
    </>
  )
}

// One full-app screenshot cut into two panels by `object-position`: the
// sidebar, and the main content area. Both sit in one plane tilted steeply
// back and turned so it rises to the right; the main panel overlaps the
// sidebar's right half and floats above it (translateZ + shadow), then the
// plane fades out to the bottom and right. md+ only. Static.
function LayeredShot({ shot, sidebar }: { shot: FeatureShot; sidebar: number }) {
  const w = shot.width ?? 16
  const h = shot.height ?? 10
  const panel = "absolute overflow-hidden border border-line bg-panel p-1"
  const img = "block size-full border border-line bg-canvas object-cover"
  return (
    <div className="relative hidden aspect-16/9 overflow-clip perspective-[2000px] mask-b-from-45% mask-b-to-95% mask-r-from-75% mask-r-to-100% md:block">
      <div className="absolute top-[26%] left-[5%] w-[118%] origin-top-left transform-3d [transform:rotateX(46deg)_rotateZ(-13deg)]">
        <div className={cn(panel, "top-[5%] left-0 w-[17%]")} style={{ aspectRatio: `${sidebar * w} / ${h}` }}>
          <img src={shot.src} alt="" width={w} height={h} loading="eager" decoding="async" className={cn(img, "object-left")} />
        </div>
        <div
          className={cn(panel, "top-0 left-[9%] w-[88%] shadow-2xl shadow-ink/20 [transform:translateZ(48px)]")}
          style={{ aspectRatio: `${(1 - sidebar) * w} / ${h}` }}
        >
          <img
            src={shot.src}
            alt={shot.alt}
            width={w}
            height={h}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className={cn(img, "object-right")}
          />
        </div>
      </div>
    </div>
  )
}

function TiltedShotHeroSection({ content }: { content: FeaturePageBase & TiltedShotHero }) {
  const { eyebrow } = content
  return (
    <Section size="lg" className="overflow-x-clip" innerClassName="pb-0 md:pb-0">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <Eyebrow icon={eyebrow.icon}>{eyebrow.label}</Eyebrow>
        <h1 className="mt-6 text-5xl font-medium tracking-tight text-balance md:text-6xl">{content.title}</h1>
        <p className="mt-6 max-w-2xl text-lg text-pretty text-ink-muted">{content.lede}</p>
        <HeroCta />
      </div>
      <div className="relative mt-10 md:mt-8">
        {/* Faint four-direction hatch behind the screenshots, masked to a
            soft radial so it has no hard edges. */}
        <div aria-hidden="true" className="pointer-events-none absolute -inset-x-12 inset-y-0 opacity-65 mask-radial-from-55% mask-radial-to-75%" style={HATCH} />
        {/* Below md (or without `sidebar`): the whole screenshot, gently
            tilted, running off the right edge at 150% so it stays legible. */}
        <div className={cn("relative aspect-4/3 overflow-clip perspective-[1800px] mask-b-from-40% mask-b-to-92%", content.shot.sidebar && "md:hidden")}>
          <div className="w-[150%] origin-top-left rotate-x-8 transform-3d md:mx-auto md:w-[88%] md:origin-top md:rotate-x-20">
            <Shot shot={content.shot} ratio="16/10" priority />
          </div>
        </div>
        {content.shot.sidebar ? <LayeredShot shot={content.shot} sidebar={content.shot.sidebar} /> : null}
      </div>
    </Section>
  )
}

// Distance from the frame's edge to the viewport edge: 0 below sm (the
// frame is full width), then half the space left over by the frame
// (FRAME_WIDTH: min(100% - 3rem, 76rem)). The section clips anything past it.
const BLEED = "[--bleed:0px] sm:[--bleed:max(1.5rem,calc((100vw_-_76rem)/2))]"

function HeroCopy({ content, center = false }: { content: FeaturePageBase; center?: boolean }) {
  const { eyebrow } = content
  return (
    <div className={cn("flex flex-col", center ? "mx-auto max-w-3xl items-center text-center" : "items-start")}>
      <Eyebrow icon={eyebrow.icon}>{eyebrow.label}</Eyebrow>
      <h1 className="mt-6 text-5xl font-medium tracking-tight text-balance md:text-6xl">{content.title}</h1>
      <p className={cn("mt-6 text-lg text-pretty text-ink-muted", center ? "max-w-2xl" : "max-w-xl")}>{content.lede}</p>
      <HeroCta />
    </div>
  )
}

// The screenshot for "split-shot": larger than the space it has, so it
// runs past the rail and is cut off by the viewport edge.
function BleedShot({ shot }: { shot: FeatureShot }) {
  return (
    <div className="flex h-full items-center py-12 pl-4 sm:pl-6 md:py-16 lg:pl-10">
      <div className="w-[150%] max-w-none shrink-0 shadow-2xl shadow-ink/10 sm:w-[125%] lg:w-[64rem]">
        <Shot shot={shot} ratio="16/10" priority />
      </div>
    </div>
  )
}

function SplitShotHeroSection({ content }: { content: FeaturePageBase & SplitShotHero }) {
  return (
    <Section flush className={cn("overflow-x-clip", BLEED)}>
      <div className="grid lg:grid-cols-[5fr_7fr]">
        <div className="border-b border-line px-4 py-16 sm:px-6 md:py-24 lg:flex lg:flex-col lg:justify-center lg:border-r lg:border-b-0 lg:px-10 lg:py-28">
          <HeroCopy content={content} />
        </div>
        {/* The stage: from the column's left hairline to the viewport edge. */}
        <div className="relative mr-[calc(var(--bleed)*-1)] overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-65 mask-y-from-85% mask-y-to-100%"
            style={HATCH}
          />
          <div className="relative h-full">{content.shot ? <BleedShot shot={content.shot} /> : content.visual}</div>
        </div>
      </div>
    </Section>
  )
}

function FloatingHeroSection({ content }: { content: FeaturePageBase & FloatingHero }) {
  return (
    <Section size="lg" className="overflow-x-clip">
      <HeroCopy content={content} center />
      <div className="relative mt-12 md:mt-16">
        {/* Same hatch as the tilted hero, masked to a soft radial. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-12 -inset-y-10 opacity-65 mask-radial-from-45% mask-radial-to-75%"
          style={HATCH}
        />
        <div className="relative">{content.visual}</div>
      </div>
    </Section>
  )
}

function Hero({ content }: { content: FeaturePageBase & IllustrationHero }) {
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
            <HeroCta />
          </div>
        }
        end={content.illustration}
      />
    </Section>
  )
}

function RowVisual({ row }: { row: FeatureRow }) {
  if (row.visual) return row.visual
  if (row.shot) return <Shot shot={row.shot} ratio="4/3" />
  return <ShotPlaceholder label={row.screenshot ?? ""} ratio="4/3" />
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
            end={<RowVisual row={row} />}
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
      {content.heroLayout === "tilted-shot" ? (
        <TiltedShotHeroSection content={content} />
      ) : content.heroLayout === "split-shot" ? (
        <SplitShotHeroSection content={content} />
      ) : content.heroLayout === "floating" ? (
        <FloatingHeroSection content={content} />
      ) : (
        <>
          <Hero content={content} />
          <Section size="md" tone="canvas">
            <ShotPlaceholder label={content.screenshot} ratio="16/9" />
          </Section>
        </>
      )}
      <Rows rows={content.rows} />
      <Details details={content.details} />
      <HomeFaq items={content.faq.items} title={content.faq.title} />
      <ClosingCta />
    </>
  )
}
