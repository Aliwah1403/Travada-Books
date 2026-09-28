import { buttonVariants } from "@travada-books/ui/components/button"
import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Mail01Icon,
  MpesaIcon,
  PlusSignIcon,
} from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { AppLink } from "~/components/app-link"
import { ClosingCta } from "~/components/home/closing"
import { ARROW_NUDGE, LearnMore } from "~/components/home/shared"
import { ToolMarquee } from "~/components/integrations/tool-marquee"
import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"
import { SectionHeading } from "~/components/site/section-heading"
import {
  INTEGRATION_CATEGORIES,
  INTEGRATIONS,
  type Integration,
  type IntegrationCategory,
} from "~/data/integrations"
import { CONTACT_EMAIL } from "~/data/site"
import { pageMeta } from "~/lib/seo"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return pageMeta({
    title: "Integrations — Travada Books",
    description: "Connect Travada Books to Gmail and Outlook today, and see upcoming M-Pesa, Stripe and WhatsApp integrations.",
    path: "/integrations",
  })
}

const REQUEST_ID = "request"

/* COPY: needs Curtis's approval */
const CATEGORY_BLURB: Record<IntegrationCategory, string> = {
  Email: "Receipts and supplier invoices, pulled in from the inbox you already use.",
  Imports: "The statements you already get, uploaded and sorted for you.",
  Payments: "Ways to get paid, on the roadmap and marked until they're ready.",
  Messaging: "Reach customers on the channel they already use.",
}

function Hero() {
  return (
    // Tight vertical rhythm so the marquee, heading, lede and CTA all sit in
    // the first screen (checked at 1280×800 and 1440×900).
    <Section innerClassName="py-8 md:py-10">
      <ToolMarquee />
      <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center text-center md:mt-8">
        <h1 className="text-5xl font-medium tracking-tight text-balance md:text-6xl">
          Your tools should bring the paperwork with them.
        </h1>
        {/* COPY: needs Curtis's approval */}
        <p className="mt-5 max-w-2xl text-lg text-pretty text-ink-muted">
          Connect the inbox you already use and upload the statements you already get. Payments and messaging are
          next, and clearly marked until they&rsquo;re ready.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          <AppLink to="signup" location="integrations" className={cn(buttonVariants({ size: "lg" }), "text-sm", ARROW_NUDGE)}>
            Start free <ArrowRight01Icon aria-hidden="true" />
          </AppLink>
          {/* COPY: needs Curtis's approval */}
          <LearnMore to={`#${REQUEST_ID}`}>Request an integration</LearnMore>
        </div>
        <p className="mt-5 flex items-center gap-2 text-sm text-ink-subtle">
          <CheckmarkCircle01Icon className="size-4 text-brand-line" aria-hidden="true" />
          Free during beta · No card required
        </p>
      </div>
    </Section>
  )
}

function StatusBadge({ live }: { live: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-xs tracking-wide uppercase",
        live ? "border-brand-line/40 bg-brand-soft text-brand" : "border-line bg-canvas text-ink-subtle",
      )}
    >
      {live ? <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-line" /> : null}
      {live ? "Live" : "Coming soon"}
    </span>
  )
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const { name, description, status, Icon, glyph } = integration
  const live = status === "available"
  return (
    <li className="flex flex-col bg-panel p-6">
      <div className="flex items-start justify-between gap-4">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-12 items-center justify-center border border-line bg-panel",
            !live && "border-dashed border-line-strong",
          )}
        >
          <span className={cn("flex items-center", !live && "opacity-50 grayscale")}>
            {/* MpesaIcon is a wide wordmark (height = 0.6 × size), so it takes a larger size. */}
            <Icon size={Icon === MpesaIcon ? 30 : 28} className={glyph ? "size-7 text-brand" : undefined} />
          </span>
        </span>
        <StatusBadge live={live} />
      </div>
      <h3 className={cn("mt-8 text-lg font-medium", live ? "text-ink" : "text-ink-muted")}>{name}</h3>
      <p className="mt-1.5 text-sm text-pretty text-ink-muted">{description}</p>
    </li>
  )
}

// Fills the empty cell when a category has an odd number of entries, so
// the hairline grid never shows a bare gap.
function RequestCard() {
  return (
    <li className="flex">
      <a
        href={`#${REQUEST_ID}`}
        className="flex w-full flex-col bg-panel p-6 transition-colors active:opacity-80 fine-hover:bg-canvas"
      >
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center border border-dashed border-line-strong text-ink-subtle"
        >
          <PlusSignIcon className="size-5" />
        </span>
        {/* COPY: needs Curtis's approval */}
        <span className="mt-8 text-lg font-medium text-ink">Missing one?</span>
        <span className="mt-1.5 flex items-center gap-1 text-sm font-medium text-brand">
          Request an integration <ArrowRight01Icon className="size-4" aria-hidden="true" />
        </span>
      </a>
    </li>
  )
}

function Catalogue() {
  return (
    <Section size="lg">
      {/* COPY: needs Curtis's approval */}
      <SectionHeading
        eyebrow={<Eyebrow>Catalogue</Eyebrow>}
        title="What Travada Books works with."
        lede="Everything marked Live works today. Everything else is on the roadmap, and says so."
      />

      <div className="mt-12 flex flex-col gap-12 md:mt-16 md:gap-16">
        {INTEGRATION_CATEGORIES.map((category) => {
          const items = INTEGRATIONS.filter((integration) => integration.category === category)
          if (items.length === 0) return null
          return (
            <div key={category} className="grid gap-6 border-t border-line pt-8 lg:grid-cols-[3fr_9fr] lg:gap-10">
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-medium text-ink">{category}</h2>
                <p className="max-w-xs text-sm text-pretty text-ink-muted">{CATEGORY_BLURB[category]}</p>
              </div>
              <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
                {items.map((integration) => (
                  <IntegrationCard key={integration.id} integration={integration} />
                ))}
                {items.length % 2 === 1 ? <RequestCard /> : null}
              </ul>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function RequestRow() {
  return (
    <Section size="sm" tone="canvas" id={REQUEST_ID} className="scroll-mt-16">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-12">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center border border-line bg-panel">
            <Mail01Icon className="size-5 text-brand-line" />
          </span>
          {/* COPY: needs Curtis's approval */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-medium tracking-tight text-balance">Missing a tool you use?</h2>
            <p className="max-w-xl text-base text-pretty text-ink-muted">
              Tell us what it is and what you&rsquo;d want it to do for your business. A person reads every
              request.
            </p>
          </div>
        </div>
        <LearnMore to={`mailto:${CONTACT_EMAIL}?subject=Integration%20request`} className="shrink-0 pl-14 md:pl-0">
          Request an integration
        </LearnMore>
      </div>
    </Section>
  )
}

export default function Integrations() {
  return (
    <>
      <Hero />
      <Catalogue />
      <RequestRow />
      <ClosingCta />
    </>
  )
}
