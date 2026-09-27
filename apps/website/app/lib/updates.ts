import type { Frontmatter, MdxModule } from "~/lib/content"

// Updates-only content helpers for the /updates changelog and its detail
// pages. Kept apart from lib/content.ts (shared by every collection) so the
// changelog's extra frontmatter — tag mapping, `inline`, `image` — is
// validated in one place without touching the shared loader.

/** Tag ids in the order the filter row shows them. */
export const UPDATE_TAG_IDS = ["product", "improvement", "fix", "company"] as const
export type UpdateTagId = (typeof UPDATE_TAG_IDS)[number]

/** Pill label per tag — what the changelog and detail header show. */
export const UPDATE_TAG_LABELS: Record<UpdateTagId, string> = {
  product: "Product",
  improvement: "Improvement",
  fix: "Fix",
  company: "Company",
}

// Frontmatter `tag` values accepted per tag, compared lowercased.
const TAG_ALIASES: Record<string, UpdateTagId> = {
  product: "product",
  "product update": "product",
  improvement: "improvement",
  improvements: "improvement",
  fix: "fix",
  fixes: "fix",
  "bug fix": "fix",
  company: "company",
  "company update": "company",
  "company news": "company",
}

export function isUpdateTagId(value: unknown): value is UpdateTagId {
  return typeof value === "string" && (UPDATE_TAG_IDS as readonly string[]).includes(value)
}

export type UpdateFrontmatter = Frontmatter & {
  /** Display label (UPDATE_TAG_LABELS), replacing the raw frontmatter value. */
  tag: string
  tagId: UpdateTagId
  /** Render the full body on /updates (default) or the summary + "Read more". */
  inline: boolean
  /** Alt text for `image`; empty (decorative) when omitted. */
  imageAlt?: string
  /** A coded cover (green backdrop + product visual) from
   *  components/updates/covers.tsx. Only for updates that need a picture. */
  cover?: UpdateCoverId
}

export const UPDATE_COVER_IDS = ["inbox", "payments", "portal", "website"] as const
export type UpdateCoverId = (typeof UPDATE_COVER_IDS)[number]

export type UpdateEntry = {
  slug: string
  collection: "updates"
  frontmatter: UpdateFrontmatter
  Component: MdxModule["default"]
}

const REQUIRED_FIELDS = ["title", "summary", "publishedAt", "tag"] as const
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function fail(slug: string, message: string): never {
  throw new Error(`content/updates/${slug}.mdx: ${message}`)
}

function slugFromPath(filePath: string): string {
  const match = filePath.match(/\/([^/]+)\.mdx$/)
  if (!match) throw new Error(`Unexpected MDX content path: ${filePath}`)
  return match[1]
}

function validate(slug: string, raw: Record<string, unknown>): UpdateFrontmatter {
  for (const field of REQUIRED_FIELDS) {
    if (!raw[field]) fail(slug, `missing required frontmatter field "${field}"`)
  }
  for (const field of ["publishedAt", "updatedAt"] as const) {
    const value = raw[field]
    if (value !== undefined && (typeof value !== "string" || !DATE_PATTERN.test(value))) {
      fail(slug, `"${field}" must be a YYYY-MM-DD date`)
    }
  }

  const tagId = TAG_ALIASES[String(raw.tag).trim().toLowerCase()]
  if (!tagId) {
    fail(slug, `unknown tag "${String(raw.tag)}" — use one of: ${Object.values(UPDATE_TAG_LABELS).join(", ")}`)
  }
  if (raw.inline !== undefined && typeof raw.inline !== "boolean") {
    fail(slug, `"inline" must be true or false`)
  }
  if (raw.image !== undefined && (typeof raw.image !== "string" || !/^(\/|https:\/\/)/.test(raw.image))) {
    fail(slug, `"image" must be a site path (/…) or an https URL`)
  }
  if (raw.imageAlt !== undefined && typeof raw.imageAlt !== "string") {
    fail(slug, `"imageAlt" must be a string`)
  }
  if (raw.cover !== undefined && !(UPDATE_COVER_IDS as readonly unknown[]).includes(raw.cover)) {
    fail(slug, `unknown cover "${String(raw.cover)}" — use one of: ${UPDATE_COVER_IDS.join(", ")}`)
  }

  return {
    ...(raw as Frontmatter),
    tag: UPDATE_TAG_LABELS[tagId],
    tagId,
    inline: raw.inline !== false,
  }
}

/**
 * Published updates, newest first, from an eager
 * `import.meta.glob("…/content/updates/*.mdx", { eager: true })` — the full
 * modules, since the changelog renders bodies inline.
 */
export function buildUpdates(modules: Record<string, MdxModule>): UpdateEntry[] {
  return Object.entries(modules)
    .map(([filePath, mod]) => {
      const slug = slugFromPath(filePath)
      return {
        slug,
        collection: "updates" as const,
        frontmatter: validate(slug, mod.frontmatter ?? {}),
        Component: mod.default,
      }
    })
    .filter((entry) => !entry.frontmatter.draft)
    .sort((a, b) => {
      if (a.frontmatter.publishedAt !== b.frontmatter.publishedAt) {
        return a.frontmatter.publishedAt < b.frontmatter.publishedAt ? 1 : -1
      }
      return a.slug.localeCompare(b.slug)
    })
}

/** Tags that at least one entry uses, in UPDATE_TAG_IDS order, with counts. */
export function updateTagCounts(entries: UpdateEntry[]): { id: UpdateTagId; label: string; count: number }[] {
  return UPDATE_TAG_IDS.map((id) => ({
    id,
    label: UPDATE_TAG_LABELS[id],
    count: entries.filter((entry) => entry.frontmatter.tagId === id).length,
  })).filter((tag) => tag.count > 0)
}

/** One published update by slug. */
export function findUpdate(modules: Record<string, MdxModule>, slug: string | undefined): UpdateEntry | undefined {
  return buildUpdates(modules).find((entry) => entry.slug === slug)
}
