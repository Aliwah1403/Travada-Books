import { useState } from "react"
import { Link } from "react-router"

import { buttonVariants } from "@travada-books/ui/components/button"
import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  ClockCheckIcon,
  ReceiptTextIcon,
  RepeatIcon,
} from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { AppLink } from "~/components/app-link"
import { Container } from "~/components/container"
import {
  FeaturePreview,
  type FeatureVisual,
} from "~/components/feature-preview"
import { Faq } from "~/components/home/faq"
import { IntegrationsSection } from "~/components/integrations-section"

// Static light-mode mockup card — this dashboard preview never re-themes for
// dark mode, so no dark: variants are needed anywhere in this component.
const HERO_CARD = "rounded-[.55rem] border border-[#e8e7e2] bg-white"
const HERO_NAV_ITEM =
  "flex items-center gap-[.55rem] rounded-[.35rem] px-[.6rem] py-[.55rem] font-sans text-[.59rem] font-medium leading-none text-[#88877f]"

const STATUS_STYLES: Record<string, string> = {
  Paid: "justify-self-end rounded-full bg-[#eef5ef] px-[.4rem] py-[.25rem] font-sans text-[.43rem] leading-none font-medium not-italic text-[#39845c]",
  Sent: "justify-self-end rounded-full bg-[#edf2f7] px-[.4rem] py-[.25rem] font-sans text-[.43rem] leading-none font-medium not-italic text-[#567189]",
  "Due soon":
    "justify-self-end rounded-full bg-[#f7f1e7] px-[.4rem] py-[.25rem] font-sans text-[.43rem] leading-none font-medium not-italic text-[#936c31]",
}

function HeroProduct() {
  return (
    <div
      aria-label="Travada Books dashboard preview"
      className="home-product-window"
    >
      <div className="flex h-[3.55rem] items-center border-b border-[#e8e7e2] px-[1.1rem]">
        <div className="flex items-center gap-2">
          <span className="grid h-[1.65rem] w-[1.65rem] place-items-center rounded-[.42rem] bg-[#1f201c] font-heading text-[.75rem] leading-none [font-weight:650] text-[#dfff3f]">
            T
          </span>
          <span className="font-heading text-[11px] font-semibold">
            Travada Books
          </span>
        </div>
        <div className="mx-auto w-[11rem] rounded-[.4rem] border border-[#e6e5df] px-[.65rem] py-[.42rem] font-sans text-[.58rem] leading-none font-normal text-[#aaa9a2]">
          Search anything
        </div>
        <div className="grid h-[1.75rem] w-[1.75rem] place-items-center rounded-full bg-[#eef0e8] font-sans text-[.55rem] leading-none font-semibold text-[#56584f]">
          CA
        </div>
      </div>

      <div className="grid grid-cols-[10rem_1fr] min-h-[29rem] max-[640px]:grid-cols-1 max-[640px]:min-h-[23rem]">
        <aside className="flex flex-col gap-[.23rem] border-r border-[#e8e7e2] bg-[#fafaf7] px-[.8rem] py-[1.15rem] max-[640px]:hidden">
          <span className={cn(HERO_NAV_ITEM, "bg-[#eeeee8] text-[#272721]")}>
            <span className="text-[#5d5c56]">◫</span> Overview
          </span>
          <span className={HERO_NAV_ITEM}>
            <span className="text-[#5d5c56]">↗</span> Invoices
          </span>
          <span className={HERO_NAV_ITEM}>
            <span className="text-[#5d5c56]">≡</span> Transactions
          </span>
          <span className={HERO_NAV_ITEM}>
            <span className="text-[#5d5c56]">⌁</span> Inbox
          </span>
          <span className={HERO_NAV_ITEM}>
            <span className="text-[#5d5c56]">□</span> Vault
          </span>
          <div className="flex-1" />
          <small className="text-[.48rem] tracking-[.12em] text-[#aaa9a1]">
            BOOKS HEALTH
          </small>
          <div className="mt-[.55rem] rounded-[.4rem] border border-[#e2e2db] bg-white p-[.6rem] font-sans text-[.52rem] leading-none font-medium">
            <i className="mr-[.35rem] inline-block h-[.4rem] w-[.4rem] rounded-full bg-[#39a86b] shadow-[0_0_0_3px_#e0f4e8]" />{" "}
            All caught up
          </div>
        </aside>

        <div className="bg-[#fdfdfb] p-[1.6rem] max-[640px]:p-[.85rem]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#9a9991] font-sans text-[.53rem] font-semibold leading-none tracking-[.13em]">
                SEPTEMBER 2026
              </p>
              <h2 className="mt-[.5rem] text-[1.15rem] tracking-[-.035em] [font-weight:570]">
                Good morning, Curtis.
              </h2>
              <p className="mt-[.22rem] text-[#8b8a82] font-heading text-[.6rem] leading-[1.3]">
                Your business is up to date.
              </p>
            </div>
            <button
              type="button"
              className="rounded-[.38rem] bg-[#24241f] px-[.8rem] py-[.55rem] font-sans text-[.56rem] leading-none font-medium text-white"
            >
              + New invoice
            </button>
          </div>

          <div className="mt-[1.4rem] grid grid-cols-3 gap-[.7rem] max-[640px]:grid-cols-2">
            <article className={cn(HERO_CARD, "min-h-[6.3rem] p-[.8rem]")}>
              <span className="block font-heading text-[.55rem] leading-none text-[#8d8c85]">
                Money in
              </span>
              <strong className="mt-[.75rem] block font-heading text-[.92rem] leading-none tracking-[-.03em] [font-weight:560]">
                KES 428,500
              </strong>
              <small className="mt-[.65rem] block font-sans text-[.49rem] leading-none font-medium text-[#3e9a67]">
                ↗ 18% this month
              </small>
            </article>
            <article className={cn(HERO_CARD, "min-h-[6.3rem] p-[.8rem]")}>
              <span className="block font-heading text-[.55rem] leading-none text-[#8d8c85]">
                Outstanding
              </span>
              <strong className="mt-[.75rem] block font-heading text-[.92rem] leading-none tracking-[-.03em] [font-weight:560]">
                KES 74,200
              </strong>
              <small className="mt-[.65rem] block font-sans text-[.49rem] leading-none font-medium text-[#3e9a67]">
                3 invoices
              </small>
            </article>
            <article className={cn(HERO_CARD, "min-h-[6.3rem] p-[.8rem]")}>
              <span className="block font-heading text-[.55rem] leading-none text-[#8d8c85]">
                Cash flow
              </span>
              <svg
                className="mt-[.75rem] block h-[3rem] w-full overflow-visible"
                viewBox="0 0 180 48"
                role="img"
                aria-label="Cash flow trending upward"
              >
                <path
                  className="fill-none stroke-[#398e61] stroke-2"
                  d="M2 43 C28 42 28 27 52 30 S82 38 99 21 S132 29 152 11 S169 8 178 3"
                />
              </svg>
            </article>
          </div>

          <div className="mt-[.7rem] grid grid-cols-[1.65fr_1fr] gap-[.7rem] max-[640px]:grid-cols-1">
            <article className={cn(HERO_CARD, "p-[.8rem]")}>
              <div className="flex min-h-[1.25rem] items-center justify-between mb-[.35rem] font-heading text-[.57rem] leading-none">
                <strong>Recent invoices</strong>
                <span className="text-[.49rem] text-[#31845b]">View all</span>
              </div>
              {[
                ["Lumo Studio", "INV-043", "KES 48,000", "Paid"],
                ["Northline Ltd", "INV-044", "KES 72,500", "Sent"],
                ["Acacia House", "INV-045", "KES 31,200", "Due soon"],
              ].map(([name, number, amount, status]) => (
                <div
                  className="grid grid-cols-[1.35rem_1fr_auto_3.3rem] items-center gap-[.5rem] border-t border-[#efeee9] py-[.58rem]"
                  key={number}
                >
                  <span className="grid h-[1.3rem] w-[1.3rem] place-items-center rounded-[.32rem] border border-[#e4e3de] bg-[#f5f5f0] font-heading text-[.48rem] leading-none font-semibold">
                    {name.slice(0, 1)}
                  </span>
                  <span>
                    <b className="block font-heading text-[.51rem] leading-[1.2] font-medium">
                      {name}
                    </b>
                    <small className="mt-[.15rem] block font-sans text-[.44rem] leading-none text-[#aaa9a1]">
                      {number}
                    </small>
                  </span>
                  <strong className="font-sans text-[.49rem] leading-none font-medium">
                    {amount}
                  </strong>
                  <em className={STATUS_STYLES[status]}>{status}</em>
                </div>
              ))}
            </article>

            <article className={cn(HERO_CARD, "p-[.8rem]")}>
              <div className="flex min-h-[1.25rem] items-center justify-between mb-[.35rem] font-heading text-[.57rem] leading-none">
                <strong>Working for you</strong>
              </div>
              <div className="flex items-center gap-[.55rem] border-t border-[#efeee9] py-[.59rem]">
                <span className="grid h-[1.4rem] w-[1.4rem] place-items-center rounded-[.34rem] bg-[#eff3e6] text-[#4c6940]">
                  <RepeatIcon className="w-[.75rem]" />
                </span>
                <p>
                  <b className="block font-heading text-[.5rem] leading-[1.2] font-medium">
                    Invoice scheduled
                  </b>
                  <small className="mt-[.18rem] block font-sans text-[.43rem] leading-none text-[#aaa9a1]">
                    Northline · 1 Oct
                  </small>
                </p>
              </div>
              <div className="flex items-center gap-[.55rem] border-t border-[#efeee9] py-[.59rem]">
                <span className="grid h-[1.4rem] w-[1.4rem] place-items-center rounded-[.34rem] bg-[#eff3e6] text-[#4c6940]">
                  <ClockCheckIcon className="w-[.75rem]" />
                </span>
                <p>
                  <b className="block font-heading text-[.5rem] leading-[1.2] font-medium">
                    Reminder sent
                  </b>
                  <small className="mt-[.18rem] block font-sans text-[.43rem] leading-none text-[#aaa9a1]">
                    INV-039 · Today
                  </small>
                </p>
              </div>
              <div className="flex items-center gap-[.55rem] border-t border-[#efeee9] py-[.59rem]">
                <span className="grid h-[1.4rem] w-[1.4rem] place-items-center rounded-[.34rem] bg-[#eff3e6] text-[#4c6940]">
                  <ReceiptTextIcon className="w-[.75rem]" />
                </span>
                <p>
                  <b className="block font-heading text-[.5rem] leading-[1.2] font-medium">
                    Receipt matched
                  </b>
                  <small className="mt-[.18rem] block font-sans text-[.43rem] leading-none text-[#aaa9a1]">
                    Adobe · KES 8,240
                  </small>
                </p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  )
}

type ProductStory = {
  title: string
  shortTitle: string
  description: string
  href: string
  linkLabel: string
  visual: FeatureVisual
}

const productStories: ProductStory[] = [
  {
    title: "Invoices keep their own schedule.",
    shortTitle: "Invoicing",
    description:
      "Set a recurring invoice once, preview the next send dates, and let reminders follow up when a payment runs late.",
    href: "/invoicing",
    linkLabel: "Explore invoicing",
    visual: "recurring",
  },
  {
    title: "Statements arrive messy. They leave organised.",
    shortTitle: "Statement import",
    description:
      "Upload a bank or M-Pesa statement as CSV or PDF, review the records, and categorise the books without rebuilding a spreadsheet.",
    href: "/statement-import",
    linkLabel: "See statement import",
    visual: "import",
  },
  {
    title: "Receipts meet the transaction they belong to.",
    shortTitle: "Inbox",
    description:
      "Bring receipts in from Gmail or Outlook, keep them searchable in your Vault, and match them to the right money movement.",
    href: "/inbox",
    linkLabel: "Explore the Inbox",
    visual: "matching",
  },
]

const TAB_BUTTON_BASE = cn(
  "grid grid-cols-[2.4rem_1fr] gap-[1rem] min-h-[9rem] border-b border-[var(--website-line)] p-[1.65rem] text-left",
  "text-[color-mix(in_oklab,var(--website-ink)_48%,transparent)] hover:text-[var(--website-ink)]",
  "[transition:min-height_.35s_var(--ease-out),background_.25s_var(--ease-out),color_.25s_var(--ease-out)]",
  "max-[900px]:grid-cols-1 max-[900px]:min-h-[12rem] max-[900px]:border-r max-[900px]:border-[var(--website-line)] max-[900px]:[&:nth-child(3)]:border-r-0",
  "max-[640px]:grid-cols-[2.2rem_1fr] max-[640px]:min-h-auto max-[640px]:border-r-0 max-[640px]:p-[1.35rem]",
)
const TAB_BUTTON_ACTIVE =
  "min-h-[14rem] bg-[color-mix(in_oklab,var(--website-green)_5%,var(--website-paper))] text-[var(--website-ink)]"
const TAB_DESCRIPTION_BASE = cn(
  "mt-0 max-h-0 max-w-[26rem] overflow-hidden opacity-0",
  "text-[.78rem] leading-[1.6] text-[color-mix(in_oklab,var(--website-ink)_57%,transparent)] font-heading",
  "[transition:max-height_.35s_var(--ease-out),margin_.35s_var(--ease-out),opacity_.25s_var(--ease-out)]",
  "max-[900px]:hidden",
)
const TAB_DESCRIPTION_ACTIVE = "mt-[1rem] max-h-[6rem] opacity-100"

function ProductShowcase() {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeStory = productStories[activeIndex]

  return (
    <section
      data-dark-surface
      className="bg-[var(--website-paper)] py-[8rem] text-[var(--website-ink)] max-[640px]:py-[5.5rem]"
      id="how-it-works"
    >
      <Container>
        <div className="flex items-end justify-between gap-[3rem] max-[640px]:block">
          <h2 className="text-[clamp(2.5rem,4.8vw,4.75rem)] leading-[.98] tracking-[-.065em] [font-weight:520]">
            One place for the work
            <br />
            around the work.
          </h2>
          <p className="max-w-[26rem] text-[color-mix(in_oklab,var(--website-ink)_59%,transparent)] font-heading text-[.95rem] leading-[1.65] max-[640px]:mt-[1.5rem]">
            From sending the invoice to finding the receipt later, Travada Books
            keeps the routine moving without hiding what it is doing.
          </p>
        </div>

        <div className="mt-[4.5rem] grid grid-cols-[minmax(19rem,.78fr)_minmax(0,1.22fr)] gap-px border border-[var(--website-line)] bg-[var(--website-line)] max-[900px]:grid-cols-1 max-[640px]:mt-[3rem]">
          <div
            className="flex flex-col bg-[var(--website-paper)] max-[900px]:grid max-[900px]:grid-cols-3 max-[640px]:flex"
            role="tablist"
            aria-label="Travada Books product areas"
          >
            {productStories.map((story, index) => {
              const isActive = index === activeIndex
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="product-showcase-stage"
                  className={cn(TAB_BUTTON_BASE, isActive && TAB_BUTTON_ACTIVE)}
                  key={story.shortTitle}
                  onClick={() => setActiveIndex(index)}
                >
                  <span className="pt-[.2rem] text-[var(--website-green)] font-sans text-[.58rem] font-semibold leading-none">
                    0{index + 1}
                  </span>
                  <div>
                    <small className="font-sans text-[.56rem] font-semibold leading-none tracking-[.09em] uppercase">
                      {story.shortTitle}
                    </small>
                    <h3 className="mt-[.75rem] max-w-[24rem] text-[inherit] text-[clamp(1.25rem,2vw,1.75rem)] leading-[1.05] tracking-[-.045em] [font-weight:560]">
                      {story.title}
                    </h3>
                    <p
                      className={cn(
                        TAB_DESCRIPTION_BASE,
                        isActive && TAB_DESCRIPTION_ACTIVE,
                      )}
                    >
                      {story.description}
                    </p>
                  </div>
                </button>
              )
            })}
            <Link
              to={activeStory.href}
              className="group mt-auto mr-[1.65rem] mb-[1.65rem] ml-[5rem] inline-flex items-center gap-[.5rem] text-[var(--website-green)] font-sans text-[.66rem] font-semibold leading-none max-[900px]:col-span-full max-[900px]:m-[1.5rem] max-[640px]:ml-[4.5rem]"
            >
              {activeStory.linkLabel}{" "}
              <ArrowRight01Icon className="w-[.85rem] transition-transform duration-200 [transition-timing-function:var(--ease-out)] group-hover:translate-x-[4px]" />
            </Link>
          </div>

          <div
            data-preview-stage
            className="grid min-h-[42rem] overflow-hidden bg-[#f4f2eb] max-[900px]:min-h-[34rem] max-[640px]:min-h-[25rem]"
            id="product-showcase-stage"
            role="tabpanel"
          >
            <FeaturePreview
              key={activeStory.visual}
              visual={activeStory.visual}
              label={`${activeStory.shortTitle} product preview`}
            />
          </div>
        </div>
      </Container>
    </section>
  )
}

const localFacts = [
  [
    "01",
    "M-Pesa and bank statements",
    "Import the records Kenyan businesses already receive.",
  ],
  [
    "02",
    "KES at the centre",
    "Run the books in shillings while invoicing clients in other currencies.",
  ],
  [
    "03",
    "Built in Nairobi",
    "Product decisions come from the workflows we see around us.",
  ],
  [
    "04",
    "Human support",
    "Get a clear answer from a person when the books need attention.",
  ],
]

function BuiltForHere() {
  return (
    <section className="bg-[var(--website-green)] py-[8rem] text-white max-[640px]:py-[5.5rem]">
      <Container>
        <div className="grid grid-cols-[1.05fr_.75fr] items-end gap-[clamp(3rem,9vw,9rem)] max-[900px]:grid-cols-1 max-[900px]:items-start max-[900px]:gap-[2rem]">
          <h2 className="max-w-[48rem] text-[clamp(2.5rem,4.7vw,4.8rem)] leading-[.98] tracking-[-.065em] text-white [font-weight:520]">
            Software that understands how business is done here.
          </h2>
          <div>
            <p className="mt-0 max-w-[33rem] text-[.95rem] leading-[1.7] text-[#d9ebe2] font-heading">
              Bank statements that split debit and credit. M-Pesa records.
              Clients who pay in pounds while you run the business in shillings.
              Travada Books is designed around the work Kenyan businesses
              actually do.
            </p>
            <Link
              to="/about"
              className="mt-auto inline-flex items-center gap-[.5rem] pt-[2rem] text-[#dafa4d] font-sans text-[.67rem] font-semibold leading-none [&_svg]:w-[.85rem] [&_svg]:transition-transform [&_svg]:duration-[250ms] [&_svg]:[transition-timing-function:var(--ease-out)] hover:[&_svg]:translate-x-[4px]"
            >
              Why we’re building Travada <ArrowRight01Icon />
            </Link>
          </div>
        </div>
        <div className="mt-[5rem] grid grid-cols-4 border-y border-[#69a88f] max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
          {localFacts.map(([number, title, body]) => (
            <article
              key={title}
              className="border-r border-[#69a88f] p-[1.5rem] first:border-l max-[900px]:[&:nth-child(-n+2)]:border-b min-h-[13rem] max-[640px]:min-h-[11rem] max-[640px]:border-l max-[640px]:border-b max-[640px]:last:border-b-0"
            >
              <span className="text-[.58rem] font-semibold leading-none text-[#dafa4d] font-sans">
                {number}
              </span>
              <h3 className="mt-[3rem] text-[1rem] tracking-[-.03em] text-white [font-weight:560] max-[640px]:mt-[2rem]">
                {title}
              </h3>
              <p className="mt-[1.7rem] max-w-[33rem] text-[.95rem] leading-[1.7] text-[#d9ebe2] font-heading">
                {body}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

const audiences = [
  [
    "01",
    "Freelancers",
    "Stop remembering to chase invoice #14. Let the reminder go out while you keep working.",
  ],
  [
    "02",
    "Consultants",
    "Turn the same monthly retainer into a recurring invoice that simply runs.",
  ],
  [
    "03",
    "Small businesses",
    "Move the books out of the notebook and into one dependable, searchable place.",
  ],
  [
    "04",
    "Agencies",
    "Send quotes, get a yes, and turn them into invoices without typing the work twice.",
  ],
]

function Audience() {
  return (
    <section className="audience-section">
      <Container>
        <div className="flex items-end justify-between gap-[3rem] max-[640px]:block">
          <h2 className="text-[clamp(2.5rem,4.8vw,4.75rem)] leading-[.98] tracking-[-.065em] [font-weight:520]">
            For people doing
            <br />
            the work and the books.
          </h2>
          <Link
            to="/who-its-for"
            className="inline-flex items-center gap-[.5rem] text-[var(--website-green)] font-sans text-[.7rem] font-semibold leading-none max-[640px]:mt-[1.5rem]"
          >
            Find your workflow <ArrowRight01Icon className="w-[.85rem]" />
          </Link>
        </div>
        <div className="mt-[4.5rem] grid grid-cols-4 border-y border-[var(--website-line)] max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
          {audiences.map(([number, title, body]) => (
            <article
              key={title}
              className="relative min-h-[17rem] border-r border-[var(--website-line)] p-[1.4rem] transition-[background,transform] duration-300 [transition-timing-function:var(--ease-out)] first:border-l fine-hover:z-[1] fine-hover:-translate-y-[5px] fine-hover:bg-[#f0eee6] max-[900px]:[&:nth-child(-n+2)]:border-b max-[640px]:border-l max-[640px]:border-b max-[640px]:last:border-b-0"
            >
              <span className="text-[.58rem] font-semibold leading-none text-[var(--website-green)] font-sans">
                {number}
              </span>
              <h3 className="mt-[3.5rem] text-[1.2rem] tracking-[-.035em] [font-weight:570]">
                {title}
              </h3>
              <p className="mt-[1rem] text-[.78rem] leading-[1.6] text-[color-mix(in_oklab,var(--website-ink)_56%,transparent)] font-heading">
                {body}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

function ClosingCta() {
  return (
    <section
      data-dark-surface
      className="bg-[var(--website-paper)] pt-0 pb-[7rem] text-[var(--website-ink)] max-[640px]:pb-[4rem]"
    >
      <Container>
        <div className="grid grid-cols-[1.25fr_.75fr] items-end gap-[4rem] border border-[var(--website-line)] bg-[#1d211d] p-[clamp(3rem,7vw,6rem)] text-[#f6f6ee] max-[900px]:grid-cols-1 max-[900px]:items-start max-[640px]:gap-[2.5rem] max-[640px]:p-[3rem_1.5rem] dark:bg-[#1d201c]">
          <div>
            <p className="text-[#dafa4d] font-sans text-[.53rem] font-semibold leading-none tracking-[.13em]">
              FREE DURING BETA · NO CREDIT CARD REQUIRED
            </p>
            <h2 className="mt-[1.3rem] text-[clamp(3rem,6.5vw,6.4rem)] leading-[.88] tracking-[-.075em] [font-weight:520]">
              Do the work.
              <br />
              <em className="not-italic text-[var(--website-green)]">
                Not the paperwork.
              </em>
            </h2>
          </div>
          <div className="flex flex-col items-start">
            <p className="mt-0 mb-[2rem] max-w-[22rem] text-[.95rem] leading-[1.65] text-[#aab1a8] font-heading">
              Set up the books once. Give the business your attention.
            </p>
            <AppLink
              to="signup"
              location="cta-band"
              className={buttonVariants({
                size: "lg",
                className:
                  "rounded-[.55rem] bg-[#dafa4d] px-[1.35rem] text-[#151714] shadow-[inset_0_0_0_1px_rgb(255_255_255/10%),0_8px_24px_rgb(30_28_23/15%)]",
              })}
            >
              Start free <ArrowRight01Icon />
            </AppLink>
          </div>
        </div>
      </Container>
    </section>
  )
}

export function MarketingHome() {
  return (
    <>
      <section data-dark-surface className="home-hero">
        <Container className="home-hero__layout">
          <div className="home-hero__copy">
            <Link to="/updates" className="home-hero__announcement group">
              <span>NEW</span>
              <span>Built for Kenyan businesses</span>
              <ArrowRight01Icon />
            </Link>
            <h1>
              Your books run.
              <em>You run the business.</em>
            </h1>
            <p className="home-hero__lede">
              Invoicing and bookkeeping for freelancers and small businesses in
              Kenya. Send invoices on schedule, follow up automatically, and
              organise bank and M-Pesa records without rebuilding another
              spreadsheet.
            </p>
            <div className="home-hero__actions">
              <AppLink
                to="signup"
                location="hero"
                className={buttonVariants({
                  size: "lg",
                  className:
                    "rounded-[.45rem] bg-[var(--website-ink)] px-[1.35rem] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/10%),0_8px_24px_rgb(30_28_23/15%)]",
                })}
              >
                Start free <ArrowRight01Icon />
              </AppLink>
              <Link
                to="#how-it-works"
                className={buttonVariants({
                  variant: "ghost",
                  size: "lg",
                  className:
                    "group rounded-[.45rem] px-[1rem] text-[var(--website-ink)] hover:bg-transparent",
                })}
              >
                See the workflow{" "}
                <ArrowRight01Icon className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <p className="home-hero__byline">
              <CheckmarkCircle01Icon /> Free during beta <span /> No credit card
              required
            </p>
          </div>

          <div className="home-hero__product">
            <div className="home-hero__product-meta">
              <span>
                <i /> LIVE BOOKS
              </span>
              <span>NAIROBI · SEPT 2026</span>
            </div>
            <HeroProduct />
          </div>
        </Container>

        <Container
          className="home-hero__signals"
          aria-label="Travada Books capabilities"
        >
          <div>
            <span>01</span>
            <strong>Invoices that remember</strong>
            <small>Recurring schedules and follow-ups</small>
          </div>
          <div>
            <span>02</span>
            <strong>Records that arrive ready</strong>
            <small>Bank and M-Pesa statement imports</small>
          </div>
          <div>
            <span>03</span>
            <strong>Receipts that find their place</strong>
            <small>Gmail and Outlook matching</small>
          </div>
          <div>
            <span>04</span>
            <strong>Built for business here</strong>
            <small>KES-centred · Made in Nairobi</small>
          </div>
        </Container>
      </section>

      <ProductShowcase />
      <BuiltForHere />
      <Audience />
      <IntegrationsSection showEyebrow={false} />
      <div className="bg-[var(--website-paper)] text-[var(--website-ink)]">
        <Faq
          eyebrow={null}
          heading="Questions, answered plainly."
          className="py-[7.5rem] md:py-[7.5rem] bg-transparent"
          headingClassName="text-[clamp(2.3rem,4vw,4rem)] [font-weight:520] tracking-[-.06em] leading-none"
          accordionClassName="mt-[3rem]"
        />
      </div>
      <ClosingCta />
    </>
  )
}
