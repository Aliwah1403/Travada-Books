import {
  CheckmarkCircle02Icon,
  Clock01Icon,
  Copy01Icon,
  Download01Icon,
  Globe02Icon,
  Invoice01Icon,
  FileEditIcon,
  PencilEdit01Icon,
  ReloadIcon,
} from "@travada-books/ui/icons"

import { FeaturePage, type FeaturePageContent } from "~/components/feature/feature-page"
import { QuoteToInvoice } from "~/components/illustrations/quote-to-invoice"
import { QUOTES_FAQ_ITEMS } from "~/data/faq"
import { faqPageJsonLd, pageMeta } from "~/lib/seo"

// ⚠️ No "M-Pesa" anywhere on this page, meta included — quotes are
// invoicing content (WEBSITE-PLAN.md §5 rule 4).
// COPY: everything on this page is new — needs Curtis's approval.
// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return [
    ...pageMeta({
      title: "Quotes — Travada Books",
      description:
        "Send a quote as a link. Your customer accepts or declines it without an account, and an accepted quote becomes a draft invoice on its own.",
      path: "/quotes",
      image: "/og/default.png",
    }),
    faqPageJsonLd(QUOTES_FAQ_ITEMS),
  ]
}

const CONTENT: FeaturePageContent = {
  eyebrow: { label: "Quotes", icon: FileEditIcon },
  title: "A yes that turns into an invoice.",
  lede: "The customer agrees to the quote, and now you're retyping the same line items into an invoice. Send the quote as a link instead. When they accept it, the invoice is already drafted.",
  illustration: <QuoteToInvoice className="mx-auto w-full max-w-xl lg:max-w-none" />,
  screenshot: "Quote detail — status, valid-until date and activity",
  rows: [
    {
      label: "Create",
      icon: PencilEdit01Icon,
      title: "Built like an invoice",
      body: "Add your line items, tax and discount, and a valid-until date, on the same layout as your invoices. Send it by email, or copy the link and share it wherever you talk to the customer.",
      screenshot: "Quote editor — line items, tax and valid-until date",
    },
    {
      label: "Respond",
      icon: CheckmarkCircle02Icon,
      title: "They answer from the link",
      body: "The customer opens the quote in their browser. No app, no signup. They accept it, or decline it and tell you why if they want to.",
      screenshot: "Public quote page — Accept and Decline, no login required",
    },
    {
      label: "Convert",
      icon: Invoice01Icon,
      title: "Accepted means invoiced",
      body: "When a quote is accepted, Travada Books drafts the invoice with the same line items and emails you to say so. Check it, send it. You retype nothing.",
      screenshot: "Invoice drafted from an accepted quote",
    },
    {
      label: "Revise",
      icon: ReloadIcon,
      title: "Not a yes? Try again.",
      body: "A declined quote can be revised and sent again. Once its valid-until date passes, a quote can't be accepted any more, so nobody signs off on last quarter's prices.",
      screenshot: "Declined quote with the customer's reason",
    },
  ],
  details: [
    {
      title: "Download as PDF",
      body: "Every quote downloads as a PDF with your logo and details on it.",
      icon: Download01Icon,
    },
    {
      title: "Duplicate a quote",
      body: "Start the next quote from one you've already written.",
      icon: Copy01Icon,
    },
    {
      title: "Activity on every quote",
      body: "See when it was created, sent, accepted or declined.",
      icon: Clock01Icon,
    },
    {
      title: "Any currency",
      body: "Quote in the currency your customer pays in, the same as your invoices.",
      icon: Globe02Icon,
    },
  ],
  faq: { title: "Quotes questions", items: QUOTES_FAQ_ITEMS },
}

export default function Quotes() {
  return <FeaturePage content={CONTENT} />
}
