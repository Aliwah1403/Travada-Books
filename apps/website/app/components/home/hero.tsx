import { Link } from "react-router"

import { buttonVariants } from "@travada-books/ui/components/button"
import {
  ArrowRight01Icon,
  BankIcon,
  CheckmarkCircle01Icon,
  FileSpreadsheetIcon,
  GmailIcon,
  InboxIcon,
  OutlookIcon,
  type Icon,
} from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { AppLink } from "~/components/app-link"
import { HOW_IT_WORKS_ID } from "~/components/home/anchors"
import { BooksStack } from "~/components/illustrations/books-stack"
import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"
import { Split } from "~/components/site/split"

/* -------------------------------------------------------------------------- */
/* 1 · Hero                                                                    */
/* -------------------------------------------------------------------------- */

export function Hero() {
  return (
    <Section flush>
      <Split
        center
        // Stacks until lg so the illustration's callouts keep their size;
        // from lg the illustration gets the wider column.
        className="md:grid-cols-1 lg:grid-cols-[5fr_7fr]"
        startClassName="md:border-r-0 md:border-b lg:border-r lg:border-b-0 md:py-24 lg:py-28"
        endClassName="lg:px-8"
        start={
          <div className="flex flex-col items-start">
            <Link
              to="/inbox"
              className="rounded-full transition-colors active:opacity-80 fine-hover:[&>span]:border-line-strong"
            >
              <Eyebrow variant="pill" icon={InboxIcon} className="gap-2 transition-colors">
                <span className="font-medium text-ink">New</span>
                <span aria-hidden="true">·</span>
                Receipts from Gmail and Outlook
                <ArrowRight01Icon className="size-3.5 text-ink-subtle" aria-hidden="true" />
              </Eyebrow>
            </Link>

            <h1 className="mt-8 text-5xl font-medium tracking-tight text-balance md:text-6xl">
              Your books run. <span className="block text-ink-muted">You run the business.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-pretty text-ink-muted">
              Invoicing and bookkeeping for freelancers and small businesses in Kenya. Send invoices on
              schedule, follow up automatically, and organise bank and M-Pesa records without rebuilding
              another spreadsheet.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <AppLink to="signup" location="hero" className={cn(buttonVariants({ size: "lg" }), "text-sm")}>
                Start free <ArrowRight01Icon aria-hidden="true" />
              </AppLink>
              <a
                href={`#${HOW_IT_WORKS_ID}`}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-line-strong bg-panel text-sm")}
              >
                See how it works
              </a>
            </div>

            <p className="mt-5 flex items-center gap-2 text-sm text-ink-subtle">
              <CheckmarkCircle01Icon className="size-4 text-brand-line" aria-hidden="true" />
              Free during beta · No card required
            </p>
          </div>
        }
        end={<BooksStack className="mx-auto w-full max-w-xl lg:max-w-none" />}
      />
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/* 2 · Works with                                                              */
/* -------------------------------------------------------------------------- */

type Source = { name: string; detail: string; icon: Icon }

// Only what's live today (data/integrations.ts "available" + statement
// import). Labelled as sources, never as customers.
const SOURCES: Source[] = [
  { name: "Gmail", detail: "Connect", icon: GmailIcon },
  { name: "Outlook", detail: "Connect", icon: OutlookIcon },
  { name: "Bank statements", detail: "PDF or CSV", icon: BankIcon },
  { name: "M-Pesa statements", detail: "PDF or CSV", icon: FileSpreadsheetIcon },
]

export function WorksWith() {
  return (
    <Section flush aria-label="Imports from and connects to">
      <div className="grid grid-cols-2 gap-px bg-line lg:grid-cols-5">
        <div className="col-span-2 flex items-center bg-panel px-4 py-5 sm:px-6 lg:col-span-1 lg:px-10">
          <p className="font-mono text-xs tracking-wide text-ink-muted uppercase">Imports from and connects to</p>
        </div>
        {SOURCES.map(({ name, detail, icon: SourceIcon }) => (
          <div key={name} className="flex items-center gap-3 bg-panel px-4 py-5 sm:px-6">
            <SourceIcon size={22} className="shrink-0 text-ink-muted grayscale" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{name}</p>
              <p className="font-mono text-xs tracking-wide text-ink-subtle uppercase">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
