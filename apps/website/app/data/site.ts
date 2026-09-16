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
}

export const FEATURES_NAV: NavLink[] = [
  { label: "Invoicing", href: "/invoicing" },
  { label: "Statement import", href: "/statement-import" },
  { label: "Inbox", href: "/inbox" },
]

export const HEADER_NAV: NavLink[] = [
  { label: "Who it's for", href: "/who-its-for" },
  { label: "Updates", href: "/updates" },
]

export const FOOTER_LINKS: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Features",
    links: FEATURES_NAV,
  },
  {
    heading: "Resources",
    links: [
      { label: "Updates", href: "/updates" },
      { label: "Guides", href: "/guides" },
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
