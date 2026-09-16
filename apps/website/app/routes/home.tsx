import { MarketingHome } from "~/components/home/marketing-home"
import { FAQ_ITEMS } from "~/data/faq"
import { PRICING_PLANS } from "~/data/pricing"
import { faqPageJsonLd, organizationJsonLd, pageMeta, softwareApplicationJsonLd } from "~/lib/seo"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return [
    ...pageMeta({
      title: "Travada Books — Invoicing & Bookkeeping Software for Kenya",
      description:
        "Invoicing and bookkeeping software for Kenyan freelancers and small businesses. Automate recurring invoices, reminders, bank and M-Pesa imports, and receipt matching.",
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
