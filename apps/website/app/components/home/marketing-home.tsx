import { Link } from "react-router"

import { Button } from "@travada-books/ui/components/button"
import {
  ArrowRight01Icon,
  BankIcon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  ClockCheckIcon,
  FileSpreadsheetIcon,
  GmailIcon,
  InboxIcon,
  Invoice01Icon,
  OutlookIcon,
  ReceiptTextIcon,
  RepeatIcon,
  SparklesIcon,
  TickIcon,
  VaultIcon,
} from "@travada-books/ui/icons"

import { AppLink } from "~/components/app-link"
import { Container } from "~/components/container"
import { Faq } from "~/components/home/faq"

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="section-kicker">
      <span aria-hidden="true" />
      {children}
    </p>
  )
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
            <article>
              <span>Money in</span>
              <strong>KES 428,500</strong>
              <small>↗ 18% this month</small>
            </article>
            <article>
              <span>Outstanding</span>
              <strong>KES 74,200</strong>
              <small>3 invoices</small>
            </article>
            <article className="hero-product__mini-chart">
              <span>Cash flow</span>
              <svg viewBox="0 0 180 48" role="img" aria-label="Cash flow trending upward">
                <path d="M2 43 C28 42 28 27 52 30 S82 38 99 21 S132 29 152 11 S169 8 178 3" />
                <path className="area" d="M2 43 C28 42 28 27 52 30 S82 38 99 21 S132 29 152 11 S169 8 178 3 V48 H2Z" />
              </svg>
            </article>
          </div>

          <div className="hero-product__lower">
            <article className="hero-product__table">
              <div className="hero-product__card-title">
                <strong>Recent invoices</strong><span>View all</span>
              </div>
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
      <div className="hero-product__float hero-product__float--left">
        <span><CheckmarkCircle01Icon /></span>
        <p><b>Invoice paid</b><small>KES 48,000 received</small></p>
      </div>
      <div className="hero-product__float hero-product__float--right">
        <span><SparklesIcon /></span>
        <p><b>127 transactions sorted</b><small>Your books are up to date</small></p>
      </div>
    </div>
  )
}

function AutomationRail() {
  const steps = [
    { icon: Calendar01Icon, title: "Set the schedule", body: "Choose when it starts, how often it repeats, and when it ends." },
    { icon: Invoice01Icon, title: "Travada sends it", body: "The next invoice goes out on time, with the right number and due date." },
    { icon: ClockCheckIcon, title: "Late? We follow up", body: "Automatic reminders keep the awkward chasing out of your day." },
    { icon: TickIcon, title: "You stay in control", body: "See what is paid, pending, overdue, and coming next in one place." },
  ]

  return (
    <section className="process-section" id="how-it-works">
      <Container>
        <div className="section-heading-row">
          <div>
            <Eyebrow>How it works</Eyebrow>
            <h2>Set the rhythm once.<br />Let the month run.</h2>
          </div>
          <p>Travada Books turns the repetitive parts of invoicing into a dependable monthly system—without taking control away from you.</p>
        </div>
        <div className="process-grid">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <article key={step.title}>
                <div className="process-grid__meta"><span>0{index + 1}</span><Icon /></div>
                <div className="process-grid__line"><i /></div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

function InvoiceIllustration() {
  return (
    <div className="line-illustration invoice-illustration" aria-hidden="true">
      <div className="paper paper--back" />
      <div className="paper paper--front">
        <div className="paper__head"><span>TRAVADA</span><small>INVOICE #048</small></div>
        <div className="paper__address"><i /><i /><i /></div>
        <div className="paper__rows"><i /><i /><i /></div>
        <div className="paper__total">TOTAL <b>KES 72,500</b></div>
      </div>
      <div className="schedule-chip"><Calendar01Icon /><span><b>Next send</b><small>01 October · 9:00</small></span></div>
    </div>
  )
}

function StatementIllustration() {
  return (
    <div className="line-illustration statement-illustration" aria-hidden="true">
      <div className="statement-upload"><FileSpreadsheetIcon /><b>august-statement.csv</b><small>428 transactions</small></div>
      <svg viewBox="0 0 420 160">
        <path d="M90 76 H170" /><path d="M250 76 H328" />
        <circle cx="210" cy="76" r="39" />
        <path d="M196 76l10 10 21-23" />
      </svg>
      <div className="statement-result"><BankIcon /><b>All sorted</b><small>Income · Expenses · Transfers</small></div>
    </div>
  )
}

function InboxIllustration() {
  return (
    <div className="line-illustration inbox-illustration" aria-hidden="true">
      <div className="mail-source"><GmailIcon /><OutlookIcon /></div>
      <div className="match-card">
        <span className="match-card__icon"><ReceiptTextIcon /></span>
        <p><b>Adobe receipt</b><small>PDF · KES 8,240</small></p>
        <i />
        <p><b>Adobe Systems</b><small>Transaction · 14 Aug</small></p>
        <em><CheckmarkCircle01Icon /> Match found</em>
      </div>
    </div>
  )
}

function FeatureShowcase() {
  return (
    <section className="feature-showcase" id="features">
      <Container>
        <div className="section-heading-row section-heading-row--stacked">
          <div>
            <Eyebrow>One calm place for the books</Eyebrow>
            <h2>The admin gets handled.<br />You get your attention back.</h2>
          </div>
        </div>

        <div className="feature-bento">
          <article className="feature-panel feature-panel--wide">
            <div className="feature-panel__copy">
              <span className="feature-number">01 / INVOICING</span>
              <h3>Invoices that remember when to send themselves.</h3>
              <p>Build it once, choose the schedule, and see the next three send dates before anything goes out. Quotes become invoices without retyping.</p>
              <Link to="/invoicing">Explore invoicing <ArrowRight01Icon /></Link>
            </div>
            <InvoiceIllustration />
          </article>

          <article className="feature-panel">
            <div className="feature-panel__copy">
              <span className="feature-number">02 / BOOKKEEPING</span>
              <h3>A year of records. Sorted in a minute.</h3>
              <p>Upload a bank or M-Pesa statement as CSV or PDF. Travada reads the columns, imports the records, and helps categorise the lot.</p>
              <Link to="/statement-import">See statement import <ArrowRight01Icon /></Link>
            </div>
            <StatementIllustration />
          </article>

          <article className="feature-panel feature-panel--dark">
            <div className="feature-panel__copy">
              <span className="feature-number">03 / INBOX</span>
              <h3>Your receipts find their own transaction.</h3>
              <p>Connect Gmail or Outlook. Supplier invoices and receipts arrive in your Vault and get matched to the money movement they belong to.</p>
              <Link to="/inbox">Explore the Inbox <ArrowRight01Icon /></Link>
            </div>
            <InboxIllustration />
          </article>
        </div>
      </Container>
    </section>
  )
}

function BuiltForHere() {
  return (
    <section className="local-section">
      <Container className="local-section__grid">
        <div>
          <Eyebrow>Built in Nairobi</Eyebrow>
          <h2>Software that understands how business is done here.</h2>
          <p>Bank statements that split debit and credit. M-Pesa records. Clients who pay in pounds while you run the business in shillings. Travada Books is designed around the work Kenyan businesses actually do.</p>
          <Link to="/about">Why we’re building Travada <ArrowRight01Icon /></Link>
        </div>
        <div className="local-diagram" aria-hidden="true">
          <div className="local-diagram__map">
            <svg viewBox="0 0 300 300">
              <path d="M97 35l42 8 24 22 37-4 15 27-12 35 22 26-18 25-9 43-30 38-34-9-14-32-35-28 11-39-24-24 20-31-8-29z" />
              <circle cx="159" cy="169" r="5" /><circle className="pulse" cx="159" cy="169" r="13" />
            </svg>
            <span>NAIROBI<br /><b>01°17′S · 36°49′E</b></span>
          </div>
          <div className="local-diagram__signals">
            <span><i /> KES base currency</span>
            <span><i /> Multi-currency invoices</span>
            <span><i /> M-Pesa statement import</span>
            <span><i /> Human support</span>
          </div>
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
          <div><Eyebrow>Who it’s for</Eyebrow><h2>Built for people doing<br />the work and the books.</h2></div>
          <Link to="/who-its-for">Find your workflow <ArrowRight01Icon /></Link>
        </div>
        <div className="audience-grid">
          {audiences.map(([number, title, body]) => (
            <article key={title}><span>{number}</span><h3>{title}</h3><p>{body}</p><i>↗</i></article>
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
          <span className="closing-cta__orbit" aria-hidden="true"><i /><i /><i /></span>
          <p className="product-overline">YOUR BOOKS CAN RUN WITHOUT RUNNING YOUR DAY</p>
          <h2>Do the work.<br /><em>Not the paperwork.</em></h2>
          <p>Start free while Travada Books is in beta. No credit card required.</p>
          <Button size="lg" render={<AppLink to="signup" location="cta-band" />}>
            Start free <ArrowRight01Icon />
          </Button>
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
          <Link to="/updates" className="announcement-pill">
            <span>NEW</span> Built for Kenyan businesses <ArrowRight01Icon />
          </Link>
          <h1>Your books run.<br /><em>You run the business.</em></h1>
          <p className="home-hero__lead">Invoicing and bookkeeping for freelancers and small businesses in Kenya. Send invoices on schedule, follow up automatically, and sort a year of bank records in minutes.</p>
          <div className="home-hero__actions">
            <Button size="lg" render={<AppLink to="signup" location="hero" />}>
              Start free <ArrowRight01Icon />
            </Button>
            <Button size="lg" variant="outline" render={<Link to="#how-it-works" />}>
              See how it works
            </Button>
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

      <AutomationRail />
      <FeatureShowcase />
      <BuiltForHere />
      <Audience />
      <div className="home-faq"><Faq heading="Questions, answered plainly." /></div>
      <ClosingCta />
    </>
  )
}
