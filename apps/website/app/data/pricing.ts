import type { FaqItem } from "~/data/faq"

// Flip once real pricing is decided (see WEBSITE-PLAN.md §6, "/pricing (dummy)").
// While false: the header and footer omit the Pricing link, /pricing renders
// noindex and is excluded from the sitemap, and the home FAQ's "cost" answer
// says "free while in beta" instead of pointing at this page.
export const PRICING_PUBLISHED = false

export type PricingPlan = {
  id: string
  name: string
  audience: string
  price: string
  period: string
  features: string[]
  ctaLabel: string
  /** Visually highlighted on /pricing (brand border). Presentation only. */
  featured?: boolean
}

// Placeholder plans — every bullet is a feature that's actually shipped
// (see SESSION.md "Batch 3 — verified facts"). Prices are deliberately
// blank; filling them in is a one-file change. No founder/beta pricing.
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    audience: "For freelancers and consultants with a handful of regular clients.",
    price: "KSh —",
    period: "per month",
    features: [
      "Recurring invoices that send themselves",
      "Automatic payment reminders",
      "Quotes a client accepts with one link — no signup",
      "Bank statement import, CSV or PDF",
      "Automatic transaction categorising",
    ],
    ctaLabel: "Start free",
  },
  {
    id: "pro",
    name: "Pro",
    audience: "For agencies and growing teams juggling more clients.",
    price: "KSh —",
    period: "per month",
    features: [
      "Everything in Starter",
      "Customer statements across multiple invoices",
      "Bill in any currency, totals in your own",
      "Record partial payments against a balance",
      "Connected inbox — Gmail and Outlook receipt capture",
    ],
    ctaLabel: "Start free",
    featured: true,
  },
]

// No pricing promises, no refund/cancellation commitments — only things
// that are true today.
export const PRICING_FAQ_ITEMS: FaqItem[] = [
  {
    id: "card-required",
    question: "Do I need a card to start?",
    answer:
      "No. Travada Books doesn't take payment details today — sign up and start using it for free.",
  },
  {
    id: "pricing-final",
    question: "Is this the final pricing?",
    answer:
      "No. We haven't finalised pricing yet — these plans show the shape of what's coming, not the numbers.",
  },
  {
    id: "whats-included-now",
    question: "What's included while it's free?",
    answer:
      "Everything that's live today — recurring invoicing, reminders, statement import and the inbox. There's no limited tier while it's free.",
  },
]
