export const SITE_NAME = "Travada Books"
export const SITE_URL = "https://travadabooks.com"

// Switch to https://app.travadabooks.com once the app domain move (see
// WEBSITE-PLAN.md §11) lands.
export const APP_URL = "https://books.travadasys.com"

export const CONTACT_EMAIL = "info@travadabooks.com"

export const LOGIN_URL = `${APP_URL}/login`
export const SIGNUP_URL = `${APP_URL}/signup`

export type NavLink = {
  label: string
  href: string
  description?: string
}

export const FEATURES_NAV: NavLink[] = [
  { label: "Invoicing", href: "/invoicing", description: "Create, schedule and follow up" },
  { label: "Statement import", href: "/statement-import", description: "Bring bank and M-Pesa records in" },
  { label: "Inbox", href: "/inbox", description: "Collect and match receipts" },
]

export const HEADER_NAV: NavLink[] = [
  { label: "Who it's for", href: "/who-its-for" },
  { label: "Integrations", href: "/integrations" },
]

export const RESOURCES_NAV: NavLink[] = [
  { label: "Guides", href: "/guides", description: "Practical answers for running the books" },
  { label: "Updates", href: "/updates", description: "What we have shipped recently" },
  { label: "About", href: "/about", description: "Why Travada Books exists" },
]

export const FOOTER_LINKS: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Features",
    links: FEATURES_NAV,
  },
  {
    heading: "Resources",
    links: [
      { label: "Integrations", href: "/integrations" },
      { label: "Guides", href: "/guides" },
      { label: "Updates", href: "/updates" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
    ],
  },
]
