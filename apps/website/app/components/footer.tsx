import { Link } from "react-router"

import { cn } from "@travada-books/ui/lib/utils"

import { FRAME_GUTTER, FRAME_WIDTH } from "~/components/site/layout"
import { PRICING_PUBLISHED } from "~/data/pricing"
import { CONTACT_EMAIL, FEATURES_NAV, FOOTER_LINKS, SITE_NAME } from "~/data/site"

function isExternal(href: string) {
  return href.startsWith("mailto:") || /^https?:\/\//.test(href)
}

// Pricing is appended to the Product column once published (the header
// doesn't list it at all while pricing is a dummy page).
const FOOTER_COLUMNS = PRICING_PUBLISHED
  ? FOOTER_LINKS.map((column) =>
      column.heading === "Product"
        ? { ...column, links: [...FEATURES_NAV, { label: "Pricing", href: "/pricing" }] }
        : column,
    )
  : FOOTER_LINKS

const LINK = "text-sm text-ink-muted transition-colors fine-hover:text-ink"

export function Footer() {
  return (
    <footer className="relative -mt-px border-t border-line bg-panel">
      <div className={cn(FRAME_WIDTH, FRAME_GUTTER, "py-14 md:py-20")}>
        <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
          <div className="flex flex-col items-start gap-4">
            <Link to="/" className="flex items-center gap-2" aria-label={`${SITE_NAME} home`}>
              <img src="/logo.svg" alt="" width={24} height={24} className="size-6" />
              <span className="text-base font-semibold tracking-tight text-ink">{SITE_NAME}</span>
            </Link>
            <p className="max-w-xs text-sm text-pretty text-ink-muted">
              Invoicing and bookkeeping for small businesses and freelancers, wherever you work.
            </p>
            <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
              {CONTACT_EMAIL}
            </a>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.heading} className="flex flex-col gap-4">
                <h2 className="font-mono text-xs font-normal tracking-wide text-ink-subtle uppercase">
                  {column.heading}
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      {isExternal(link.href) ? (
                        <a href={link.href} className={LINK}>
                          {link.label}
                        </a>
                      ) : (
                        <Link to={link.href} className={LINK}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div
          className={cn(
            FRAME_WIDTH,
            FRAME_GUTTER,
            "flex flex-wrap items-center justify-between gap-3 py-6 font-mono text-xs tracking-wide text-ink-subtle uppercase",
          )}
        >
          <span>© {new Date().getFullYear()} Travada Systems. All rights reserved.</span>
          <span>Made in Nairobi</span>
        </div>
      </div>
    </footer>
  )
}
