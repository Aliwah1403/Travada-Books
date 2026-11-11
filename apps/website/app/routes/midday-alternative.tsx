import { Link } from "react-router"

import { buttonVariants } from "@travada-books/ui/components/button"
import { ArrowRight01Icon, Cancel01Icon, CheckmarkCircle01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { AppLink } from "~/components/app-link"
import { ClosingCta } from "~/components/home/closing"
import { ARROW_NUDGE, LearnMore } from "~/components/home/shared"
import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"
import { SectionHeading } from "~/components/site/section-heading"
import { ogImage } from "~/lib/og"
import { pageMeta } from "~/lib/seo"

// Unlisted while the owner decides whether to keep it: no header or footer
// link, `noindex` below, and not in CORE_STATIC_PATHS (lib/sitemap.ts). To
// publish, remove `noindex` here and add the path to CORE_STATIC_PATHS.
//
// Every row in COMPARISON was checked against Midday's source and the Travada
// app. When a feature ships, update the row and LAST_CHECKED together.
// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return pageMeta({
    title: "Midday alternative — Travada Books",
    description:
      "A plain comparison of Travada Books and Midday, what we don't have yet, and how to bring your Midday export across.",
    path: "/midday-alternative",
    image: ogImage("midday-alternative"),
    noindex: true,
  })
}

const LAST_CHECKED = "1 November 2026"
const COMPARISON_ID = "comparison"
const MOVING_ID = "moving-over"

const RAMP_POST = "https://ramp.com/blog/midday-joining-ramp"
const MIDDAY_POST = "https://midday.ai/updates/joining-ramp/"

const INLINE_LINK =
  "text-brand underline underline-offset-2 transition-colors active:opacity-80 fine-hover:text-brand-line"

type Status = "yes" | "partly" | "no"

type Side = { status: Status; note?: string }

type ComparisonRow = { feature: string; midday: Side; travada: Side }

type ComparisonGroup = { title: string; rows: ComparisonRow[] }

const YES: Side = { status: "yes" }
const NO: Side = { status: "no" }

const COMPARISON: ComparisonGroup[] = [
  {
    title: "Invoicing",
    rows: [
      { feature: "Invoices", midday: YES, travada: YES },
      { feature: "Recurring invoices", midday: YES, travada: YES },
      { feature: "Scheduled sending", midday: YES, travada: YES },
      {
        feature: "Payment reminders",
        midday: { status: "partly", note: "You send each one from the invoice." },
        travada: { status: "yes", note: "Sent for you after the due date, once switched on." },
      },
      { feature: "Part payments", midday: NO, travada: YES },
      {
        feature: "Quotes",
        midday: NO,
        travada: { status: "yes", note: "The customer answers by link. Accepting drafts the invoice." },
      },
      { feature: "Customer portal", midday: YES, travada: YES },
      { feature: "Customer statements", midday: YES, travada: YES },
      { feature: "Multiple currencies", midday: YES, travada: YES },
    ],
  },
  {
    title: "Getting paid",
    rows: [
      {
        feature: "Online payment from the invoice",
        midday: { status: "yes", note: "Through Stripe." },
        travada: {
          status: "partly",
          note: "M-Pesa, and cards once enabled on your account, through Paystack. Payouts are in KES to a Kenyan bank or M-Pesa number.",
        },
      },
    ],
  },
  {
    title: "Transactions",
    rows: [
      {
        feature: "Bank connections",
        midday: { status: "yes", note: "Through Plaid, Teller, GoCardless and Enable Banking." },
        travada: { status: "no", note: "You upload statements instead." },
      },
      { feature: "CSV statement import", midday: YES, travada: YES },
      { feature: "PDF statement import", midday: NO, travada: YES },
      { feature: "Automatic categorisation", midday: YES, travada: YES },
      {
        feature: "Your own category rules",
        midday: { status: "partly", note: "Offers to apply a category to similar transactions." },
        travada: YES,
      },
      {
        feature: "Export for your accountant",
        midday: { status: "yes", note: "CSV and Excel, with receipts." },
        travada: { status: "yes", note: "CSV or Excel, with receipts." },
      },
    ],
  },
  {
    title: "Receipts and files",
    rows: [
      { feature: "Inbox with receipt matching", midday: YES, travada: YES },
      {
        feature: "Receipts from email",
        midday: { status: "yes", note: "Gmail, Outlook or a forwarding address." },
        travada: { status: "partly", note: "Outlook or a forwarding address. Gmail by forwarding only." },
      },
      { feature: "Vault for documents", midday: YES, travada: YES },
    ],
  },
  {
    title: "Running the business",
    rows: [
      { feature: "Dashboard and metrics", midday: YES, travada: YES },
      { feature: "Supplier bills", midday: NO, travada: YES },
      { feature: "Team members", midday: YES, travada: YES },
      { feature: "Full data export", midday: YES, travada: YES },
      { feature: "Time tracking", midday: YES, travada: NO },
      { feature: "Weekly insights", midday: YES, travada: NO },
      { feature: "AI assistant", midday: YES, travada: NO },
    ],
  },
  {
    title: "Connections",
    rows: [
      {
        feature: "Accounting software sync",
        midday: { status: "yes", note: "Xero, QuickBooks and Fortnox." },
        travada: NO,
      },
      {
        feature: "Chat apps",
        midday: { status: "yes", note: "Slack, WhatsApp, Telegram and iMessage." },
        travada: NO,
      },
      { feature: "API, CLI and MCP", midday: YES, travada: NO },
      { feature: "Mac desktop app", midday: YES, travada: NO },
    ],
  },
]

const STATUS_LABEL: Record<Status, string> = { yes: "Yes", partly: "Partly", no: "No" }

const MISSING: { title: string; body: string }[] = [
  { title: "Bank connections", body: "Nothing syncs from your bank. You upload a PDF or CSV statement when you want your transactions updated." },
  { title: "Time tracking", body: "There's no timer, timesheet or project tracking." },
  { title: "Accounting sync", body: "No Xero or QuickBooks connection. You can export CSV or Excel for your accountant." },
  { title: "AI assistant", body: "There's no assistant to ask questions, and no weekly insights." },
  { title: "Chat apps", body: "No Slack, Telegram or iMessage. WhatsApp is listed as coming soon." },
  { title: "Stripe", body: "Online payments run through Paystack and pay out in Kenya. Stripe is listed as coming soon." },
  { title: "Direct Gmail connection", body: "Outlook connects directly. From Gmail, you forward receipts to your Travada inbox address." },
  { title: "API, CLI and MCP", body: "There's no public way to reach your data from your own code or AI tools yet." },
  { title: "Desktop app", body: "Travada Books runs in the browser." },
]

type MoveStep = {
  title: string
  files: string[]
  body: string
  links: { to: string; label: string }[]
}

const MOVE_STEPS: MoveStep[] = [
  {
    title: "Import your transactions",
    files: ["transactions.csv"],
    body: "Go to Transactions, then Import, and upload the file. Dates, descriptions, amounts, currencies, who it was from or to, and notes can come across. Categories, tags and tax columns don't, and Travada Books suggests a new category for each transaction. Check the dates and whether money in and money out look right before you carry on, especially if your Midday dates were month first.",
    links: [{ to: "/guides/import-a-bank-or-mpesa-statement", label: "Import a statement" }],
  },
  {
    title: "Upload your receipts",
    files: ["attachments/"],
    body: "Upload them in your Inbox and Travada Books looks for the transaction each one belongs to. Images and PDFs work, up to 10 MB each. The links between receipts and transactions in Midday don't carry over, so you confirm the matches again.",
    links: [
      { to: "/guides/forward-receipts-to-your-inbox", label: "Forward or upload receipts" },
      { to: "/guides/match-receipts-to-transactions", label: "Match receipts" },
    ],
  },
  {
    title: "Add your customers",
    files: ["customers.csv"],
    body: "There's no customer import yet, so you add them one at a time. Use the file as your list.",
    links: [{ to: "/guides/add-and-manage-customers", label: "Add customers" }],
  },
  {
    title: "Recreate what's still active",
    files: ["invoices.csv", "invoice-recurring.csv"],
    body: "Invoices can't be imported. Recreate anything unpaid, and set up your recurring invoices again, so reminders and payments work from here.",
    links: [
      { to: "/guides/create-and-send-an-invoice", label: "Create an invoice" },
      { to: "/guides/set-up-a-recurring-invoice", label: "Set up a recurring invoice" },
    ],
  },
  {
    title: "Keep the rest in your Vault",
    files: ["invoices/", "documents/", "tracker-entries.csv"],
    body: "Upload your old invoice PDFs and documents so they stay in one place. Your time entries have nowhere to live as data, but the CSV files can be stored here too.",
    links: [{ to: "/guides/store-files-in-the-vault", label: "Use the Vault" }],
  },
]

function Hero() {
  return (
    <Section innerClassName="py-16 md:py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <Eyebrow>Midday alternative</Eyebrow>
        <h1 className="mt-5 text-5xl font-medium tracking-tight text-balance md:text-6xl">
          Looking for a Midday alternative?
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-pretty text-ink-muted">
          Travada Books does your invoices, quotes, receipts and transactions in one place. It doesn&rsquo;t have bank
          connections or time tracking yet, so here&rsquo;s the full comparison to help you decide.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          <AppLink
            to="signup"
            location="midday_alternative"
            className={cn(buttonVariants({ size: "lg" }), "text-sm", ARROW_NUDGE)}
          >
            Start free <ArrowRight01Icon aria-hidden="true" />
          </AppLink>
          <LearnMore to={`#${COMPARISON_ID}`}>See the comparison</LearnMore>
        </div>
        <p className="mt-5 flex items-center gap-2 text-sm text-ink-subtle">
          <CheckmarkCircle01Icon className="size-4 text-brand-line" aria-hidden="true" />
          Free during beta · No card required
        </p>
      </div>
    </Section>
  )
}

function WhatHappened() {
  return (
    <Section size="sm" tone="canvas">
      <div className="grid gap-4 lg:grid-cols-[5fr_7fr] lg:gap-12">
        <h2 className="text-2xl font-medium tracking-tight text-balance md:text-3xl">What happened to Midday</h2>
        <div className="flex flex-col gap-4 text-base text-pretty text-ink-muted">
          <p>
            On 7 May 2026, Midday announced it was joining Ramp, with its two founders moving across. Midday said it would
            wind the product down over the next three months, with a migration path to Ramp for eligible customers. Accounts
            that didn&rsquo;t move would stay active for 90 days, with full data export.
          </p>
          <p>
            Midday was a well-made product and plenty of people relied on it. If Ramp suits you, it may be your simplest
            next step. If it doesn&rsquo;t, read on.
          </p>
          <p className="text-sm">
            Sources:{" "}
            <a href={RAMP_POST} target="_blank" rel="noreferrer" className={INLINE_LINK}>
              Ramp&rsquo;s announcement
            </a>{" "}
            and{" "}
            <a href={MIDDAY_POST} target="_blank" rel="noreferrer" className={INLINE_LINK}>
              Midday&rsquo;s announcement
            </a>
            .
          </p>
        </div>
      </div>
    </Section>
  )
}

// Half-filled disc: Hugeicons has no "partial" mark in our set. The word
// beside it carries the meaning, so nothing here relies on colour alone.
function StatusMark({ status }: { status: Status }) {
  if (status === "yes") return <CheckmarkCircle01Icon className="size-4 shrink-0 text-brand-line" aria-hidden="true" />
  if (status === "no") return <Cancel01Icon className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
  return (
    <span
      aria-hidden="true"
      className="size-3.5 shrink-0 rounded-full border border-current bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)] text-brand-line"
    />
  )
}

function SideCell({ name, side }: { name: string; side: Side }) {
  return (
    <div role="cell" className="min-w-0">
      {/* The header row is hidden below sm, so each cell names its own column there. */}
      <span className="mb-1.5 block font-mono text-xs tracking-wide text-ink-subtle uppercase sm:hidden">{name}</span>
      <span className={cn("flex items-center gap-2 text-sm font-medium", side.status === "no" ? "text-ink-muted" : "text-ink")}>
        <StatusMark status={side.status} />
        {STATUS_LABEL[side.status]}
      </span>
      {side.note ? <p className="mt-1 text-sm text-pretty text-ink-muted">{side.note}</p> : null}
    </div>
  )
}

const TABLE_COLUMNS = "sm:grid-cols-[4fr_4fr_4fr]"

// ARIA table roles on divs rather than <table>: below sm each row reflows into
// a stacked grid, which a real table can't do without losing its semantics.
function ComparisonTable() {
  return (
    <div role="table" aria-label="Midday and Travada Books compared" className="mt-10 border border-line bg-panel md:mt-12">
      <div role="rowgroup" className="hidden sm:block">
        <div role="row" className={cn("grid gap-x-6 bg-canvas px-6 py-3", TABLE_COLUMNS)}>
          <span role="columnheader" className="font-mono text-xs tracking-wide text-ink-muted uppercase">Feature</span>
          <span role="columnheader" className="font-mono text-xs tracking-wide text-ink-muted uppercase">Midday</span>
          <span role="columnheader" className="font-mono text-xs tracking-wide text-ink-muted uppercase">Travada Books</span>
        </div>
      </div>
      {COMPARISON.map((group) => (
        <div role="rowgroup" key={group.title}>
          <div role="row" className="border-t border-line bg-canvas px-4 py-3 first:border-t-0 sm:px-6">
            <span role="cell" aria-colspan={3} className="text-sm font-medium text-ink">{group.title}</span>
          </div>
          {group.rows.map((row) => (
            <div
              role="row"
              key={row.feature}
              className={cn("grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line px-4 py-4 sm:gap-x-6 sm:px-6", TABLE_COLUMNS)}
            >
              <span role="rowheader" className="col-span-2 min-w-0 text-sm font-medium text-ink sm:col-span-1">
                {row.feature}
              </span>
              <SideCell name="Midday" side={row.midday} />
              <SideCell name="Travada Books" side={row.travada} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function Comparison() {
  return (
    <Section size="md" id={COMPARISON_ID} className="scroll-mt-16">
      <SectionHeading
        eyebrow={<Eyebrow>Comparison</Eyebrow>}
        title="Feature by feature."
        lede="Midday does more in some places, and Travada Books does more in others. Yes means it's in the product. Partly means there's a limit, and the note says what it is."
      />
      <ComparisonTable />
      <p className="mt-4 text-sm text-pretty text-ink-subtle">
        Last checked: {LAST_CHECKED}. The Midday column comes from Midday&rsquo;s public source code and website, and the
        Travada Books column from our own product.
      </p>
    </Section>
  )
}

function WhatWeDontHave() {
  return (
    <Section size="md" tone="canvas">
      <SectionHeading
        eyebrow={<Eyebrow>Gaps</Eyebrow>}
        title="What we don't have yet."
        lede="If you use bank connections or time tracking every day, Travada Books won't replace Midday like for like today. We'd rather you know that now."
      />
      <ul className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3 md:mt-12">
        {MISSING.map((item) => (
          <li key={item.title} className="bg-panel p-6">
            <h3 className="text-base font-medium text-ink">{item.title}</h3>
            <p className="mt-1.5 text-sm text-pretty text-ink-muted">{item.body}</p>
          </li>
        ))}
        {/* Hairline grid: fill the last cell on two-column widths, so it never shows a bare gap. */}
        {MISSING.length % 2 === 1 ? <li aria-hidden="true" className="hidden bg-panel sm:block lg:hidden" /> : null}
      </ul>
    </Section>
  )
}

function MovingOver() {
  return (
    <Section size="md" id={MOVING_ID} className="scroll-mt-16">
      <SectionHeading
        eyebrow={<Eyebrow>Moving over</Eyebrow>}
        title="Bringing your Midday data across."
        lede="Some of it imports, and some of it you'll redo by hand. Here's which is which."
      />

      <div className="mt-10 grid gap-px border border-line bg-line md:mt-12 lg:grid-cols-2">
        <div className="bg-panel p-6">
          <h3 className="text-base font-medium text-ink">If you can still sign in to Midday</h3>
          <p className="mt-1.5 text-sm text-pretty text-ink-muted">
            Go to Settings, then Export all data. Midday builds a ZIP file and puts it in your Midday vault, under Exports.
            The steps below use the files inside it.
          </p>
        </div>
        <div className="bg-panel p-6">
          <h3 className="text-base font-medium text-ink">If you can&rsquo;t</h3>
          <p className="mt-1.5 text-sm text-pretty text-ink-muted">
            The 90 days Midday announced in May may have ended for your account. You can still rebuild your transactions:
            download statements from your bank and{" "}
            <Link to="/guides/import-a-bank-or-mpesa-statement" className={INLINE_LINK}>
              import them
            </Link>{" "}
            as PDF or CSV.
          </p>
        </div>
      </div>

      <ol className="mt-8 flex flex-col border border-line">
        {MOVE_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="grid gap-4 border-t border-line p-6 first:border-t-0 lg:grid-cols-[5fr_7fr] lg:gap-10"
          >
            <div className="flex min-w-0 flex-col items-start gap-3">
              <h3 className="text-base font-medium text-ink">
                <span className="mr-2 font-mono text-sm text-ink-subtle">{index + 1}</span>
                {step.title}
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {step.files.map((file) => (
                  <li key={file} className="border border-line bg-canvas px-1.5 py-0.5 font-mono text-xs break-all text-ink-muted">
                    {file}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex min-w-0 flex-col items-start gap-3">
              <p className="text-sm text-pretty text-ink-muted">{step.body}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {step.links.map((link) => (
                  <LearnMore key={link.to} to={link.to}>
                    {link.label}
                  </LearnMore>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-sm text-pretty text-ink-subtle">
        Importing the same file twice doesn&rsquo;t create duplicates. Two different files that cover the same dates can, so
        keep their date ranges separate.
      </p>
    </Section>
  )
}

export default function MiddayAlternative() {
  return (
    <>
      <Hero />
      <WhatHappened />
      <Comparison />
      <WhatWeDontHave />
      <MovingOver />
      <ClosingCta />
    </>
  )
}
