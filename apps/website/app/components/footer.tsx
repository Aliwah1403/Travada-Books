import { Link } from "react-router"

import { Container } from "~/components/container"
import { PRICING_PUBLISHED } from "~/data/pricing"
import { FEATURES_NAV, FOOTER_LINKS } from "~/data/site"

function isExternal(href: string) {
  return href.startsWith("mailto:") || /^https?:\/\//.test(href)
}

// Pricing is gated the same way the header gates it (see header.tsx's
// NAV_LINKS) — appended to the Features column once published.
const FOOTER_COLUMNS = PRICING_PUBLISHED
  ? FOOTER_LINKS.map((column) =>
      column.heading === "Features"
        ? { ...column, links: [...FEATURES_NAV, { label: "Pricing", href: "/pricing" }] }
        : column,
    )
  : FOOTER_LINKS

export function Footer() {
  return (
    <footer className="site-footer border-t border-border/60">
      <Container className="max-w-7xl py-14 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.25fr_2fr]">
          <div>
            <Link to="/" className="site-logo inline-flex items-center gap-2.5">
              <span className="site-logo__mark"><img src="/logo.svg" alt="" className="h-5 w-5" /></span>
              <span className="font-heading text-sm font-semibold">Travada Books</span>
            </Link>
            <p className="mt-5 max-w-[28ch] font-heading text-sm/relaxed text-muted-foreground">
              Invoicing and bookkeeping that fits how small business is done in Kenya.
            </p>
            <p className="mt-8 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              Built in Nairobi · 01°17′S
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading} className="flex flex-col gap-3">
              <span className="font-mono text-[10px] font-semibold tracking-[0.1em] text-foreground uppercase">{column.heading}</span>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {isExternal(link.href) ? (
                      <a
                        href={link.href}
                        className="fine-hover:text-foreground text-xs text-muted-foreground"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="fine-hover:text-foreground text-xs text-muted-foreground"
                      >
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

        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6 text-[11px] text-muted-foreground">
          <span>© 2026 Travada Systems. All rights reserved.</span>
          <span className="flex items-center gap-2"><i className="size-1.5 rounded-full bg-emerald-500" /> All systems operational</span>
        </div>
      </Container>
    </footer>
  )
}
