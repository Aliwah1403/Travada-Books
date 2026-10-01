import { HELP_CATEGORIES } from "~/data/help"
import { OG_PAGES, type OgPageKey } from "~/data/og-pages"
import { buildFrontmatterCollection, type MdxModule } from "~/lib/content"
import { buildUpdates } from "~/lib/updates"

// Share-card paths and content. Cards are rendered by routes/og.auto.$.tsx
// and prerendered to build/client/og/auto/<key>.png.

export type OgCard = { eyebrow: string; title: string }

export function ogImage(key: OgPageKey | `guides/${string}` | `updates/${string}`): string {
  return `/og/auto/${key}.png`
}

const guides = buildFrontmatterCollection(
  import.meta.glob<Record<string, unknown>>("../../content/guides/*.mdx", {
    eager: true,
    query: "?frontmatter",
    import: "frontmatter",
  }),
  "guides",
)
// buildUpdates only reads `frontmatter` (it validates and normalises the
// tag), so frontmatter-only modules are enough here.
const updates = buildUpdates(
  Object.fromEntries(
    Object.entries(
      import.meta.glob<Record<string, unknown>>("../../content/updates/*.mdx", {
        eager: true,
        query: "?frontmatter",
        import: "frontmatter",
      }),
    ).map(([path, frontmatter]) => [path, { frontmatter } as unknown as MdxModule]),
  ),
)

/** Card content for a key like "quotes", "guides/quick-start" or "updates/<slug>". */
export function getOgCard(key: string): OgCard | null {
  if (key in OG_PAGES) return OG_PAGES[key as OgPageKey]

  const [collection, slug] = key.split("/")
  if (collection === "guides") {
    const entry = guides.find((g) => g.slug === slug)
    if (!entry) return null
    const category = HELP_CATEGORIES.find((c) => c.id === entry.frontmatter.category)
    return { eyebrow: category ? `Guides · ${category.title}` : "Guides", title: entry.frontmatter.title }
  }
  if (collection === "updates") {
    const entry = updates.find((u) => u.slug === slug)
    if (!entry) return null
    return { eyebrow: `Changelog · ${entry.frontmatter.tag}`, title: entry.frontmatter.title }
  }
  return null
}
