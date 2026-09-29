import {
  Building01Icon,
  Calendar01Icon,
  DashboardSquare01Icon,
  Globe02Icon,
  Invoice01Icon,
  LockPasswordIcon,
  ReceiptTextIcon,
  ShareIcon,
  SmartPhone01Icon,
} from "@travada-books/ui/icons"

import { FeaturePage, type FeaturePageContent } from "~/components/feature/feature-page"
import { PortalDocumentsMockup } from "~/components/feature/mockups/customer-portal/portal-documents"
import { PortalPhoneMockup } from "~/components/feature/mockups/customer-portal/portal-phone"
import { PortalSharingMockup } from "~/components/feature/mockups/customer-portal/portal-sharing"
import { CUSTOMER_PORTAL_FAQ_ITEMS } from "~/data/faq"
import { faqPageJsonLd, pageMeta } from "~/lib/seo"
import { ogImage } from "~/lib/og"

// ⚠️ No "M-Pesa" anywhere on this page, meta included — the portal is
// invoicing content (WEBSITE-PLAN.md §5 rule 4).
// COPY: everything on this page is new — needs Curtis's approval.
// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return [
    ...pageMeta({
      title: "Customer portal — Travada Books",
      description:
        "Give each customer one private link to every invoice, quote and statement you've sent them, with what they owe at the top. No login needed.",
      path: "/customer-portal",
      image: ogImage("customer-portal"),
      // Hidden until the portal ships (2026-09-29): unlinked, out of the
      // sitemap and kept out of search. See FEATURES_NAV in data/site.ts.
      noindex: true,
    }),
    faqPageJsonLd(CUSTOMER_PORTAL_FAQ_ITEMS),
  ]
}

// Stand-in until the real screenshots are captured (same pattern as
// /invoicing). When one lands, replace `src`, `width`/`height` and `alt`
// with the shot `caption` asks for.
// ⚠️ The stand-in shows "Mpesa/Bank Deposit" in an expense card — accepted
// temporarily; the real portal shots must not show M-Pesa anywhere.
const STAND_IN = {
  src: "/shots/dummy-dashboard.webp",
  width: 2000,
  height: 1103,
  alt: "The Travada Books dashboard, with revenue, cash flow, spending and payment score cards",
}

const CONTENT: FeaturePageContent = {
  eyebrow: { label: "Customer portal", icon: Globe02Icon },
  title: "One link for everything you've sent them.",
  lede: "Invoice links get buried in email threads and chats, and then the customer asks you to send it again. Switch on their portal and send one link instead. Every invoice, quote and statement is there, with what's still owed at the top.",
  heroLayout: "split-shot",
  visual: <PortalPhoneMockup />,
  rows: [
    {
      label: "Balance",
      icon: DashboardSquare01Icon,
      title: "What's owed comes first",
      body: "The portal opens on the balance due, with how many invoices are overdue and a link straight to the oldest one. Below it sit the total invoiced, the total paid and the number of invoices, the same figures you see on the customer's page.",
      shot: {
        ...STAND_IN,
        caption: "Customer portal on desktop — the balance-due card: amount due, overdue count with the oldest due date, View oldest overdue invoice, Total invoiced / Paid / Invoices",
      },
    },
    {
      label: "Invoices",
      icon: Invoice01Icon,
      title: "Every invoice, sorted",
      body: "Outstanding and paid invoices sit in their own tabs. Part-paid invoices show what's left to pay, and any invoice opens in full or downloads as a PDF.",
      shot: {
        ...STAND_IN,
        caption: "Customer portal invoices — Outstanding / Paid toggle with counts, rows with due dates, one part-paid row showing what's left to pay",
      },
    },
    {
      label: "Quotes and statements",
      icon: ReceiptTextIcon,
      title: "Quotes and statements too",
      body: "Quotes waiting for an answer are listed, so the customer can open one and accept it from the same place. Every statement you've generated for them is one tap away.",
      visual: <PortalDocumentsMockup />,
    },
    {
      label: "Sharing",
      icon: ShareIcon,
      title: "You decide who gets one",
      body: "The portal stays off until you switch it on for a customer. Copy the link or share it on WhatsApp from the customer's page. If it ever reaches the wrong person, regenerate it and the old link stops working straight away.",
      visual: <PortalSharingMockup />,
    },
  ],
  details: [
    {
      title: "No login",
      body: "The private link is the key. Your customer has nothing to sign up for.",
      icon: LockPasswordIcon,
    },
    {
      title: "Made for phones",
      body: "Most customers open it from a message on their phone, so it's laid out for one.",
      icon: SmartPhone01Icon,
    },
    {
      title: "Your business up top",
      body: "The portal opens with your logo and business name.",
      icon: Building01Icon,
    },
    {
      title: "Short and current",
      body: "Paid invoices from the last 12 months. Anything unpaid always shows, however old.",
      icon: Calendar01Icon,
    },
  ],
  faq: { title: "Customer portal questions", items: CUSTOMER_PORTAL_FAQ_ITEMS },
}

export default function CustomerPortal() {
  return <FeaturePage content={CONTENT} />
}
