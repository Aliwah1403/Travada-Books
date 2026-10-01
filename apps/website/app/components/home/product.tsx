import type { ReactNode } from "react"

import {
  BankIcon,
  ClockCheckIcon,
  DashboardSquare01Icon,
  FileSpreadsheetIcon,
  InboxIcon,
  Invoice01Icon,
  Link01Icon,
  Mail01Icon,
  RepeatIcon,
  Tag01Icon,
  VaultIcon,
  type Icon,
} from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { HOW_IT_WORKS_ID } from "~/components/home/anchors"
import { LearnMore } from "~/components/home/shared"
import { ProductLayers } from "~/components/illustrations/product-layers"
import { ReceiptMatch } from "~/components/illustrations/receipt-match"
import { RecurringInvoices } from "~/components/illustrations/recurring-invoices"
import { StatementFlow } from "~/components/illustrations/statement-flow"
import { Eyebrow } from "~/components/site/eyebrow"
import { FeatureItem } from "~/components/site/feature-item"
import { Section } from "~/components/site/section"
import { Split } from "~/components/site/split"

/* -------------------------------------------------------------------------- */
/* 3 · The problem                                                             */
/* -------------------------------------------------------------------------- */

export function Problem() {
  return (
    <Section size="lg" tone="canvas">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <Eyebrow>The problem</Eyebrow>
        <h2 className="mt-6 text-3xl font-medium tracking-tight text-balance md:text-4xl">
          You didn&rsquo;t start a business to do paperwork.
        </h2>
        <p className="mt-6 max-w-2xl text-lg text-pretty text-ink-muted">
          Retyping last month&rsquo;s invoice. Chasing a client who&rsquo;s two weeks late. Sorting a
          statement line by line. None of it is the work, so Travada Books does it for you.
        </p>
      </div>
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/* 4 · What is Travada Books                                                   */
/* -------------------------------------------------------------------------- */

// No "M-Pesa" in this section: the Invoicing column sits beside the others
// (WEBSITE-PLAN.md §5 rule 4).
const PARTS: { title: string; body: string; icon: Icon }[] = [
  { title: "Invoicing", body: "Invoices and quotes that send on schedule and follow up on their own.", icon: Invoice01Icon },
  { title: "Statement import", body: "Upload a statement as a PDF or CSV and review it already categorised.", icon: BankIcon },
  { title: "Inbox", body: "Receipts from Gmail and Outlook, matched to the transaction they belong to.", icon: InboxIcon },
  { title: "Vault", body: "Every receipt and document, titled for you and searchable later.", icon: VaultIcon },
  { title: "Dashboard", body: "Revenue, profit, cash flow and overdue invoices at a glance.", icon: DashboardSquare01Icon },
]

export function WhatIsTravada() {
  return (
    <Section size="lg">
      <div className="grid gap-6 md:grid-cols-2 md:items-end md:gap-12">
        <div className="flex flex-col gap-4">
          <Eyebrow>What is Travada Books</Eyebrow>
          <h2 className="text-3xl font-medium tracking-tight text-balance md:text-4xl">
            One set of books behind everything you do.
          </h2>
        </div>
        <p className="text-lg text-pretty text-ink-muted">
          Invoices, statements, receipts and the numbers they add up to share one place, so nothing gets
          typed twice and nothing lives in a spreadsheet on the side.
        </p>
      </div>

      <ProductLayers className="mt-12 md:mt-16" />

      <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 md:mt-16 lg:grid-cols-5">
        {PARTS.map((part, i) => (
          <FeatureItem
            key={part.title}
            icon={part.icon}
            title={part.title}
            // Five items: the last one spans the row in the 2-column layout.
            className={cn("bg-panel p-6", i === PARTS.length - 1 && "sm:col-span-2 lg:col-span-1")}
          >
            {part.body}
          </FeatureItem>
        ))}
      </div>
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/* 5 · Feature rows                                                            */
/* -------------------------------------------------------------------------- */

type Row = {
  label: string
  icon: Icon
  title: string
  description: string
  href: string
  linkLabel: string
  /** I3 / I4 / I5 — labels drawn in the SVG from xl, legend below it. */
  visual: ReactNode
  subs: { title: string; body: string; icon: Icon }[]
}

// ⚠️ The Invoicing row must never mention M-Pesa (WEBSITE-PLAN.md §5 rule 4).
const ROWS: Row[] = [
  {
    label: "Invoicing",
    icon: Invoice01Icon,
    title: "Invoices keep their own schedule.",
    description:
      "Set a recurring invoice once, preview the next send dates, and let reminders follow up when a payment runs late.",
    href: "/invoicing",
    linkLabel: "Explore invoicing",
    visual: <RecurringInvoices labelsFrom="xl" />,
    subs: [
      {
        title: "Recurring invoices",
        body: "Weekly to yearly, with the next three send dates shown before you commit.",
        icon: RepeatIcon,
      },
      {
        title: "Automatic reminders",
        body: "Pick 3, 5, 7 or 10 days after the due date and the reminder goes out on its own.",
        icon: ClockCheckIcon,
      },
    ],
  },
  {
    label: "Statement import",
    icon: BankIcon,
    title: "Statements arrive messy. They leave organised.",
    description:
      "Upload a bank or mobile money statement as CSV or PDF, review the records, and categorise the books without rebuilding a spreadsheet.",
    href: "/statement-import",
    linkLabel: "See statement import",
    visual: <StatementFlow labelsFrom="xl" />,
    subs: [
      {
        title: "Any bank, any layout",
        body: "Reads CSV and PDF statements, including ones that split money in and money out.",
        icon: FileSpreadsheetIcon,
      },
      {
        title: "Categorised on arrival",
        body: "Transactions are categorised as they come in. Fix any of them one by one or in bulk.",
        icon: Tag01Icon,
      },
    ],
  },
  {
    label: "Inbox",
    icon: InboxIcon,
    title: "Receipts meet the transaction they belong to.",
    description:
      "Bring receipts in from Gmail or Outlook, keep them searchable in your Vault, and match them to the right money movement.",
    href: "/inbox",
    linkLabel: "Explore the Inbox",
    visual: <ReceiptMatch labelsFrom="xl" />,
    subs: [
      {
        title: "Read-only connection",
        body: "Only PDF attachments are pulled in, and you can disconnect at any time.",
        icon: Mail01Icon,
      },
      {
        title: "Matched for you",
        body: "Confident matches happen on their own. The rest are suggested for you to confirm.",
        icon: Link01Icon,
      },
    ],
  },
]

export function FeatureRows() {
  return (
    <div id={HOW_IT_WORKS_ID} className="scroll-mt-16">
      {ROWS.map((row, index) => (
        <Section key={row.label} flush>
          <Split
            center
            reverse={index % 2 === 1}
            start={
              <div className="flex flex-col items-start">
                <Eyebrow icon={row.icon}>{row.label}</Eyebrow>
                <h2 className="mt-5 text-3xl font-medium tracking-tight text-balance md:text-4xl">{row.title}</h2>
                <p className="mt-4 max-w-lg text-lg text-pretty text-ink-muted">{row.description}</p>
                <LearnMore to={row.href} className="mt-6">
                  {row.linkLabel}
                </LearnMore>

                <div className="mt-10 grid w-full border-t border-line sm:grid-cols-2">
                  {row.subs.map((sub, i) => (
                    <FeatureItem
                      key={sub.title}
                      icon={sub.icon}
                      title={sub.title}
                      className={cn(
                        "pt-6",
                        i === 0
                          ? "pb-6 sm:pr-6 sm:pb-0"
                          : "border-t border-line sm:border-t-0 sm:border-l sm:pl-6",
                      )}
                    >
                      {sub.body}
                    </FeatureItem>
                  ))}
                </div>
              </div>
            }
            end={row.visual}
          />
        </Section>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 6 · Screenshot band                                                         */
/* -------------------------------------------------------------------------- */

// The beta walkthrough from /pitch in apps/app. The source upload is a 69 MB
// HEVC .mov that Chrome and Firefox often can't play, so Cloudinary serves a
// 1600px H.264 MP4 (~10 MB) instead. preload="none" + a poster frame means
// nothing downloads until the visitor presses play.
const WALKTHROUGH_BASE = "https://res.cloudinary.com/dzycxaapd/video/upload"
const WALKTHROUGH_ID = "v1784719177/Travada_Books_Beta_v0.5_nbvbcb"
const WALKTHROUGH_SRC = `${WALKTHROUGH_BASE}/q_auto,w_1600,vc_h264/${WALKTHROUGH_ID}.mp4`
const WALKTHROUGH_POSTER = `${WALKTHROUGH_BASE}/so_3,w_1600,q_auto,f_jpg/${WALKTHROUGH_ID}.jpg`

export function ScreenshotBand() {
  return (
    <Section size="md" tone="canvas">
      <div className="border border-line bg-panel p-1.5">
        <video
          src={WALKTHROUGH_SRC}
          poster={WALKTHROUGH_POSTER}
          controls
          muted
          playsInline
          preload="none"
          aria-label="Travada Books product walkthrough"
          className="block aspect-video w-full bg-canvas"
        />
      </div>
    </Section>
  )
}
