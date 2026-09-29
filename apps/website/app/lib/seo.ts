import type { MetaDescriptor } from "react-router"

import { PRICING_PUBLISHED, type PricingPlan } from "~/data/pricing"
import type { FaqItem } from "~/data/faq"
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "~/data/site"

const DEFAULT_OG_IMAGE = "/og/auto/default.png"
const ORG_LOGO_PATH = "/web-app-manifest-512x512.png"

// Root canonicalises to "https://travadabooks.com/" (trailing slash); every
// other route canonicalises without one, e.g. "https://travadabooks.com/invoicing".
function canonicalUrl(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`
}

function absoluteUrl(pathOrUrl: string): string {
  return pathOrUrl.startsWith("http") ? pathOrUrl : `${SITE_URL}${pathOrUrl}`
}

type PageMetaOptions = {
  title: string
  description: string
  /** Route path, e.g. "/invoicing" — "/" for home. */
  path: string
  /** Absolute or site-relative OG image path. Defaults to the generated default card. */
  image?: string
  noindex?: boolean
  type?: "website" | "article"
}

/**
 * Builds the full per-route `MetaDescriptor[]` — title, description,
 * canonical, Open Graph + Twitter tags, and `robots` when noindex. React
 * Router route `meta` does NOT merge with parents, so every route calls this
 * for its full set rather than relying on root.tsx.
 */
export function pageMeta({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  noindex = false,
  type = "website",
}: PageMetaOptions): MetaDescriptor[] {
  const url = canonicalUrl(path)
  const ogImage = absoluteUrl(image)

  const meta: MetaDescriptor[] = [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:type", content: type },
    { property: "og:image", content: ogImage },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: title },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "en_KE" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ]

  if (noindex) {
    meta.push({ name: "robots", content: "noindex, nofollow" })
  }

  return meta
}

/** `Organization` JSON-LD — home and pricing. */
export function organizationJsonLd(): MetaDescriptor {
  return {
    "script:ld+json": {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl(ORG_LOGO_PATH),
      email: CONTACT_EMAIL,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Nairobi",
        addressCountry: "KE",
      },
    },
  }
}

/**
 * `SoftwareApplication` JSON-LD — home and pricing. `offers` is only
 * included once PRICING_PUBLISHED is true, derived from the real plans.
 */
export function softwareApplicationJsonLd(plans: PricingPlan[]): MetaDescriptor {
  const offers = PRICING_PUBLISHED
    ? plans.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: plan.price,
        priceCurrency: "KES",
        url: `${SITE_URL}/pricing`,
      }))
    : undefined

  return {
    "script:ld+json": {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      description:
        "Invoicing and bookkeeping software for freelancers and small businesses, wherever they work.",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Invoicing and bookkeeping software",
      operatingSystem: "Web",
      url: SITE_URL,
      inLanguage: "en",
      audience: {
        "@type": "BusinessAudience",
        audienceType: "Freelancers, consultants, agencies, and small businesses",
      },
      featureList: [
        "Recurring invoices",
        "Scheduled invoice sending",
        "Automatic overdue reminders",
        "Quote-to-invoice conversion",
        "Bank and mobile money statement import, such as M-Pesa",
        "Automatic transaction categorisation",
        "Gmail and Outlook receipt matching",
        "Multi-currency invoicing",
      ],
      isAccessibleForFree: !PRICING_PUBLISHED,
      ...(offers ? { offers } : {}),
    },
  }
}

/** `FAQPage` JSON-LD — every page that renders a `<Faq />` block. */
export function faqPageJsonLd(items: FaqItem[]): MetaDescriptor {
  return {
    "script:ld+json": {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  }
}

type ArticleJsonLdOptions = {
  headline: string
  description: string
  datePublished: string
  dateModified?: string
  image?: string
}

/** `Article` JSON-LD — `updates.$slug` and `guides.$slug`. */
export function articleJsonLd({
  headline,
  description,
  datePublished,
  dateModified,
  image = DEFAULT_OG_IMAGE,
}: ArticleJsonLdOptions): MetaDescriptor {
  return {
    "script:ld+json": {
      "@context": "https://schema.org",
      "@type": "Article",
      headline,
      description,
      datePublished,
      dateModified: dateModified ?? datePublished,
      image: absoluteUrl(image),
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl(ORG_LOGO_PATH),
        },
      },
      author: {
        "@type": "Organization",
        name: "Travada Systems",
        url: SITE_URL,
      },
    },
  }
}
