import { MarketingHome } from "~/components/home/marketing-home"
import { FAQ_ITEMS } from "~/data/faq"
import { PRICING_PLANS } from "~/data/pricing"
import { faqPageJsonLd, organizationJsonLd, pageMeta, softwareApplicationJsonLd } from "~/lib/seo"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return [
    ...pageMeta({
      title: "Travada Books — Invoicing & Bookkeeping for Small Businesses and Freelancers",
      description:
        "Invoicing and bookkeeping for freelancers and small businesses, wherever you work. Automate recurring invoices and reminders, import bank and mobile-money statements, and match receipts.",
      path: "/",
      image: "/og/home.png",
    }),
    organizationJsonLd(),
    softwareApplicationJsonLd(PRICING_PLANS),
    faqPageJsonLd(FAQ_ITEMS),
  ]
}

export default function Home() {
  return <MarketingHome />
}
