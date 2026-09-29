// Pages whose share card is generated at build time by routes/og.auto.$.tsx
// (Midday-style: one text card per page, rendered with @vercel/og). Plain
// data with no imports, so react-router.config.ts can read it to prerender
// every card.
//
// Keep `title` in step with the page's H1. Home, invoicing, statement
// import and inbox are NOT here: their cards carry the product
// illustration, which the card renderer can't draw, so they stay as fixed
// images in public/og/.
export const OG_PAGES = {
  default: { eyebrow: "Invoicing & bookkeeping", title: "Invoicing and bookkeeping for small businesses, wherever you work." },
  quotes: { eyebrow: "Quotes", title: "A yes that turns into an invoice." },
  "customer-portal": { eyebrow: "Customer portal", title: "One link for everything you've sent them." },
  payments: { eyebrow: "Payments", title: "Paid in parts. Tracked in full." },
  integrations: { eyebrow: "Integrations", title: "Your tools should bring the paperwork with them." },
  pricing: { eyebrow: "Pricing", title: "Simple pricing, on the way." },
  "who-its-for": { eyebrow: "Who it's for", title: "Built for the person doing everything." },
  about: { eyebrow: "About", title: "We were our own first customer." },
  guides: { eyebrow: "Help centre", title: "How can we help?" },
  updates: { eyebrow: "Changelog", title: "What's new in Travada Books." },
  contact: { eyebrow: "Contact", title: "How can we help?" },
  "legal-privacy": { eyebrow: "Legal", title: "Privacy Policy" },
  "legal-terms": { eyebrow: "Legal", title: "Terms of Service" },
} as const

export type OgPageKey = keyof typeof OG_PAGES
