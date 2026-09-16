import type { ComponentType } from "react"

type MdxComponentProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components?: Record<string, ComponentType<any>>
}

export type Frontmatter = {
  title: string
  summary: string
  publishedAt: string
  updatedAt?: string
  image?: string
  tag?: string
  draft?: boolean
  /** Shows the "Draft — placeholder" banner and forces noindex — legal pages only. */
  placeholder?: boolean
}

export type ContentEntry = {
  slug: string
  collection: string
  frontmatter: Frontmatter
  Component: ComponentType<MdxComponentProps>
}

export type FrontmatterEntry = {
  slug: string
  collection: string
  frontmatter: Frontmatter
}

export type MdxModule = {
  default: ComponentType<MdxComponentProps>
  frontmatter?: Record<string, unknown>
}

const REQUIRED_FIELDS = ["title", "summary", "publishedAt"] as const

function slugFromPath(filePath: string): string {
  const match = filePath.match(/\/([^/]+)\.mdx$/)
  if (!match) {
    throw new Error(`Unexpected MDX content path: ${filePath}`)
  }
  return match[1]
}

function validateFrontmatter(
  collection: string,
  slug: string,
  raw: Record<string, unknown>,
): Frontmatter {
  for (const field of REQUIRED_FIELDS) {
    if (!raw[field]) {
      throw new Error(
        `content/${collection}/${slug}.mdx is missing required frontmatter field "${field}"`,
      )
    }
  }
  return raw as Frontmatter
}

function sortByPublishedDesc<T extends { frontmatter: Frontmatter }>(entries: T[]): T[] {
  return [...entries].sort((a, b) =>
    a.frontmatter.publishedAt < b.frontmatter.publishedAt ? 1 : -1,
  )
}

/**
 * Full entries (component + frontmatter) from an eager `import.meta.glob`
 * of a single collection's folder — for `$slug` detail routes, which only
 * need their own collection's MDX bodies bundled, not every collection's.
 */
export function buildCollection(
  modules: Record<string, MdxModule>,
  collection: string,
): ContentEntry[] {
  const entries = Object.entries(modules).map(([filePath, mod]) => {
    const slug = slugFromPath(filePath)
    return {
      slug,
      collection,
      frontmatter: validateFrontmatter(collection, slug, mod.frontmatter ?? {}),
      Component: mod.default,
    }
  })
  return sortByPublishedDesc(entries.filter((entry) => !entry.frontmatter.draft))
}

/**
 * A single entry by slug, built from that collection's own glob result.
 */
export function findEntry(
  modules: Record<string, MdxModule>,
  collection: string,
  slug: string,
): ContentEntry | undefined {
  return buildCollection(modules, collection).find((entry) => entry.slug === slug)
}

/**
 * Frontmatter-only entries from an eager `import.meta.glob(..., { import:
 * "frontmatter" })` of a collection's folder — for list/index pages, which
 * need metadata but not MDX bodies.
 */
export function buildFrontmatterCollection(
  modules: Record<string, Record<string, unknown>>,
  collection: string,
): FrontmatterEntry[] {
  const entries = Object.entries(modules).map(([filePath, raw]) => {
    const slug = slugFromPath(filePath)
    return {
      slug,
      collection,
      frontmatter: validateFrontmatter(collection, slug, raw),
    }
  })
  return sortByPublishedDesc(entries.filter((entry) => !entry.frontmatter.draft))
}
