// Single source of truth for sitemap.xml (see routes/sitemap[.]xml.tsx) —
// core static routes plus every non-draft MDX entry, excluding noindex pages
// (pricing while unpublished, placeholder legal pages) and the 404.
import { buildFrontmatterCollection } from "~/lib/content"
import { PRICING_PUBLISHED } from "~/data/pricing"
import { SITE_URL } from "~/data/site"

export type SitemapUrl = {
  path: string
  lastmod?: string
}

// Every indexable route with no dynamic slug. Legal pages are handled
// separately below (only once their placeholder copy is replaced).
const CORE_STATIC_PATHS = [
  "/",
  "/invoicing",
  "/statement-import",
  "/inbox",
  "/quotes",
  "/customer-portal",
  "/payments",
  "/integrations",
  "/who-its-for",
  "/about",
  "/updates",
  "/guides",
]

const updatesModules = import.meta.glob<Record<string, unknown>>("../../content/updates/*.mdx", {
  eager: true,
  query: "?frontmatter",
  import: "frontmatter",
})
const guidesModules = import.meta.glob<Record<string, unknown>>("../../content/guides/*.mdx", {
  eager: true,
  query: "?frontmatter",
  import: "frontmatter",
})
const legalModules = import.meta.glob<Record<string, unknown>>("../../content/legal/*.mdx", {
  eager: true,
  query: "?frontmatter",
  import: "frontmatter",
})

const LEGAL_PATHS: Record<string, string> = {
  terms: "/legal/terms",
  privacy: "/legal/privacy",
}

export function getSitemapUrls(): SitemapUrl[] {
  // No lastmod for static routes: there's no honest per-page date for them,
  // and a hardcoded or build-time date would either rot or claim every page
  // changed on every deploy. MDX entries carry their frontmatter dates.
  const urls: SitemapUrl[] = CORE_STATIC_PATHS.map((path) => ({ path }))

  if (PRICING_PUBLISHED) {
    urls.push({ path: "/pricing" })
  }

  for (const entry of buildFrontmatterCollection(updatesModules, "updates")) {
    urls.push({
      path: `/updates/${entry.slug}`,
      lastmod: entry.frontmatter.updatedAt ?? entry.frontmatter.publishedAt,
    })
  }
  for (const entry of buildFrontmatterCollection(guidesModules, "guides")) {
    urls.push({
      path: `/guides/${entry.slug}`,
      lastmod: entry.frontmatter.updatedAt ?? entry.frontmatter.publishedAt,
    })
  }
  // Legal pages stay out of the sitemap while placeholder is true (noindex).
  for (const entry of buildFrontmatterCollection(legalModules, "legal")) {
    if (entry.frontmatter.placeholder) continue
    const path = LEGAL_PATHS[entry.slug]
    if (!path) continue
    urls.push({ path, lastmod: entry.frontmatter.updatedAt ?? entry.frontmatter.publishedAt })
  }

  return urls
}

export function absoluteSitemapUrl(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`
}
