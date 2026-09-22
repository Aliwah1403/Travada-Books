import { useState } from "react"
import { Link } from "react-router"

import { Button } from "@travada-books/ui/components/button"
import {
  ArrowRight01Icon,
  BankIcon,
  CheckmarkCircle01Icon,
  ClockCheckIcon,
  InboxIcon,
  ReceiptTextIcon,
  RepeatIcon,
  VaultIcon,
} from "@travada-books/ui/icons"

import { AppLink } from "~/components/app-link"
import { Container } from "~/components/container"
import { FeaturePreview, type FeatureVisual } from "~/components/feature-preview"
import { Faq } from "~/components/home/faq"
import { IntegrationsSection } from "~/components/integrations-section"

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="section-kicker"><span aria-hidden="true" />{children}</p>
}

function HeroProduct() {
  return (
    <div className="hero-product" aria-label="Travada Books dashboard preview">
      <div className="hero-product__topbar">
        <div className="flex items-center gap-2">
          <span className="hero-product__mark">T</span>
          <span className="font-heading text-[11px] font-semibold">Travada Books</span>
        </div>
        <div className="hero-product__search">Search anything</div>
        <div className="hero-product__avatar">CA</div>
      </div>

      <div className="hero-product__body">
        <aside className="hero-product__nav">
          <span className="is-active"><span>◫</span> Overview</span>
          <span><span>↗</span> Invoices</span>
          <span><span>≡</span> Transactions</span>
          <span><span>⌁</span> Inbox</span>
          <span><span>□</span> Vault</span>
          <div className="hero-product__nav-spacer" />
          <small>BOOKS HEALTH</small>
          <div className="hero-product__health"><i /> All caught up</div>
        </aside>

        <div className="hero-product__main">
          <div className="hero-product__welcome">
            <div>
              <p className="product-overline">SEPTEMBER 2026</p>
              <h2>Good morning, Curtis.</h2>
              <p>Your business is up to date.</p>
            </div>
            <button type="button">+ New invoice</button>
          </div>

          <div className="hero-product__stats">
            <article><span>Money in</span><strong>KES 428,500</strong><small>↗ 18% this month</small></article>
            <article><span>Outstanding</span><strong>KES 74,200</strong><small>3 invoices</small></article>
            <article className="hero-product__mini-chart">
              <span>Cash flow</span>
              <svg viewBox="0 0 180 48" role="img" aria-label="Cash flow trending upward">
                <path d="M2 43 C28 42 28 27 52 30 S82 38 99 21 S132 29 152 11 S169 8 178 3" />
              </svg>
            </article>
          </div>

          <div className="hero-product__lower">
            <article className="hero-product__table">
              <div className="hero-product__card-title"><strong>Recent invoices</strong><span>View all</span></div>
              {[
                ["Lumo Studio", "INV-043", "KES 48,000", "Paid"],
                ["Northline Ltd", "INV-044", "KES 72,500", "Sent"],
                ["Acacia House", "INV-045", "KES 31,200", "Due soon"],
              ].map(([name, number, amount, status]) => (
                <div className="hero-product__row" key={number}>
                  <span className="hero-product__company">{name.slice(0, 1)}</span>
                  <span><b>{name}</b><small>{number}</small></span>
                  <strong>{amount}</strong>
                  <em className={`status-${status.toLowerCase().replace(" ", "-")}`}>{status}</em>
                </div>
              ))}
            </article>

            <article className="hero-product__activity">
              <div className="hero-product__card-title"><strong>Working for you</strong></div>
              <div><span className="activity-icon"><RepeatIcon /></span><p><b>Invoice scheduled</b><small>Northline · 1 Oct</small></p></div>
              <div><span className="activity-icon"><ClockCheckIcon /></span><p><b>Reminder sent</b><small>INV-039 · Today</small></p></div>
              <div><span className="activity-icon"><ReceiptTextIcon /></span><p><b>Receipt matched</b><small>Adobe · KES 8,240</small></p></div>
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
    description: "Set a recurring invoice once, preview the next send dates, and let reminders follow up when a payment runs late.",
    href: "/invoicing",
    linkLabel: "Explore invoicing",
    visual: "recurring",
  },
  {
    title: "Statements arrive messy. They leave organised.",
    shortTitle: "Statement import",
    description: "Upload a bank or M-Pesa statement as CSV or PDF, review the records, and categorise the books without rebuilding a spreadsheet.",
    href: "/statement-import",
    linkLabel: "See statement import",
    visual: "import",
  },
  {
    title: "Receipts meet the transaction they belong to.",
    shortTitle: "Inbox",
    description: "Bring receipts in from Gmail or Outlook, keep them searchable in your Vault, and match them to the right money movement.",
    href: "/inbox",
    linkLabel: "Explore the Inbox",
    visual: "matching",
  },
]

function ProductShowcase() {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeStory = productStories[activeIndex]

  return (
    <section className="home-product" id="how-it-works">
      <Container>
        <div className="section-heading-row">
          <div><Eyebrow>How it works</Eyebrow><h2>One place for the work<br />around the work.</h2></div>
          <p>From sending the invoice to finding the receipt later, Travada Books keeps the routine moving without hiding what it is doing.</p>
        </div>

        <div className="home-product__layout">
          <div className="home-product__tabs" role="tablist" aria-label="Travada Books product areas">
            {productStories.map((story, index) => {
              const isActive = index === activeIndex
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="home-product-stage"
                  className={isActive ? "is-active" : ""}
                  key={story.shortTitle}
                  onClick={() => setActiveIndex(index)}
                >
                  <span>0{index + 1}</span>
                  <div>
                    <small>{story.shortTitle}</small>
                    <h3>{story.title}</h3>
                    <p>{story.description}</p>
                  </div>
                </button>
              )
            })}
            <Link to={activeStory.href} className="home-product__link">
              {activeStory.linkLabel} <ArrowRight01Icon />
            </Link>
          </div>

          <div className="home-product__stage" id="home-product-stage" role="tabpanel">
            <FeaturePreview key={activeStory.visual} visual={activeStory.visual} label={`${activeStory.shortTitle} product preview`} />
          </div>
        </div>
      </Container>
    </section>
  )
}

const localFacts = [
  ["01", "M-Pesa and bank statements", "Import the records Kenyan businesses already receive."],
  ["02", "KES at the centre", "Run the books in shillings while invoicing clients in other currencies."],
  ["03", "Built in Nairobi", "Product decisions come from the workflows we see around us."],
  ["04", "Human support", "Get a clear answer from a person when the books need attention."],
]

function BuiltForHere() {
  return (
    <section className="local-section">
      <Container>
        <div className="local-section__intro">
          <div><Eyebrow>Built in Nairobi</Eyebrow><h2>Software that understands how business is done here.</h2></div>
          <div>
            <p>Bank statements that split debit and credit. M-Pesa records. Clients who pay in pounds while you run the business in shillings. Travada Books is designed around the work Kenyan businesses actually do.</p>
            <Link to="/about">Why we’re building Travada <ArrowRight01Icon /></Link>
          </div>
        </div>
        <div className="local-facts">
          {localFacts.map(([number, title, body]) => (
            <article key={title}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>
          ))}
        </div>
      </Container>
    </section>
  )
}

const audiences = [
  ["01", "Freelancers", "Stop remembering to chase invoice #14. Let the reminder go out while you keep working."],
  ["02", "Consultants", "Turn the same monthly retainer into a recurring invoice that simply runs."],
  ["03", "Small businesses", "Move the books out of the notebook and into one dependable, searchable place."],
  ["04", "Agencies", "Send quotes, get a yes, and turn them into invoices without typing the work twice."],
]

function Audience() {
  return (
    <section className="audience-section">
      <Container>
        <div className="section-heading-row">
          <div><Eyebrow>Who it’s for</Eyebrow><h2>For people doing<br />the work and the books.</h2></div>
          <Link to="/who-its-for">Find your workflow <ArrowRight01Icon /></Link>
        </div>
        <div className="audience-grid">
          {audiences.map(([number, title, body]) => (
            <article key={title}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>
          ))}
        </div>
      </Container>
    </section>
  )
}

function ClosingCta() {
  return (
    <section className="closing-cta">
      <Container>
        <div className="closing-cta__inner">
          <div>
            <p className="product-overline">FREE DURING BETA · NO CREDIT CARD REQUIRED</p>
            <h2>Do the work.<br /><em>Not the paperwork.</em></h2>
          </div>
          <div className="closing-cta__action">
            <p>Set up the books once. Give the business your attention.</p>
            <Button size="lg" render={<AppLink to="signup" location="cta-band" />}>
              Start free <ArrowRight01Icon />
            </Button>
          </div>
        </div>
      </Container>
    </section>
  )
}

export function MarketingHome() {
  return (
    <>
      <section className="home-hero">
        <div className="home-hero__grid" aria-hidden="true" />
        <Container className="relative z-10 flex flex-col items-center text-center">
          <Link to="/updates" className="announcement-pill"><span>NEW</span> Built for Kenyan businesses <ArrowRight01Icon /></Link>
          <h1>Your books run.<br /><em>You run the business.</em></h1>
          <p className="home-hero__lead">Invoicing and bookkeeping for freelancers and small businesses in Kenya. Send invoices on schedule, follow up automatically, and sort a year of bank records in minutes.</p>
          <div className="home-hero__actions">
            <Button size="lg" render={<AppLink to="signup" location="hero" />}>Start free <ArrowRight01Icon /></Button>
            <Button size="lg" variant="outline" render={<Link to="#how-it-works" />}>See how it works</Button>
          </div>
          <p className="home-hero__note"><CheckmarkCircle01Icon /> Free during beta <span /> No credit card <span /> Built in Nairobi</p>
          <HeroProduct />
        </Container>
      </section>

      <section className="proof-strip" aria-label="Travada Books capabilities">
        <Container>
          <p>One system for the work around the work</p>
          <div>
            <span><RepeatIcon /> Recurring invoices</span>
            <span><ClockCheckIcon /> Automatic reminders</span>
            <span><BankIcon /> Bank & M-Pesa imports</span>
            <span><InboxIcon /> Receipt matching</span>
            <span><VaultIcon /> Searchable vault</span>
          </div>
        </Container>
      </section>

      <ProductShowcase />
      <BuiltForHere />
      <Audience />
      <IntegrationsSection />
      <div className="home-faq"><Faq heading="Questions, answered plainly." /></div>
      <ClosingCta />
    </>
  )
}
