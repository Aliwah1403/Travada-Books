import { useSyncExternalStore, type ComponentProps } from "react"
import { Link, useSearchParams } from "react-router"

import { buttonVariants } from "@travada-books/ui/components/button"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { UpdateCover } from "~/components/updates/covers"
import { UPDATES } from "~/components/content/collections"
import { EntryListEmpty } from "~/components/content/entry-list"
import { ClosingCta } from "~/components/home/closing"
import { LearnMore } from "~/components/home/shared"
import { MDX_BODY_CLASS, mdxComponents } from "~/components/mdx-components"
import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"
import { SectionHeading } from "~/components/site/section-heading"
import type { MdxModule } from "~/lib/content"
import { formatDate } from "~/lib/date"
import { pageMeta } from "~/lib/seo"
import { buildUpdates, isUpdateTagId, updateTagCounts, type UpdateEntry, type UpdateTagId } from "~/lib/updates"
import { CONTACT_EMAIL } from "~/data/site"

// Full modules, not the `?frontmatter` variant: the changelog renders each
// entry's MDX body inline. Only the updates folder is bundled here.
const modules = import.meta.glob<MdxModule>("../../content/updates/*.mdx", { eager: true })
const ENTRIES = buildUpdates(modules)
const TAGS = updateTagCounts(ENTRIES)
const PAGE_SIZE = 5

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return pageMeta({
    title: "Changelog — Travada Books",
    description: "What's new in Travada Books: product updates and company news from the team building it in Nairobi, newest first.",
    path: "/updates",
  })
}

// Inside an entry the title is the h2, so the body's own headings step down
// a level (h2 → h3, h3 → h4) and read smaller than on the article page.
const changelogComponents = {
  ...mdxComponents,
  h2: ({ className, ...props }: ComponentProps<"h2">) => (
    <h3 className={cn("mt-10 text-lg font-medium text-balance text-ink md:text-xl", className)} {...props} />
  ),
  h3: ({ className, ...props }: ComponentProps<"h3">) => (
    <h4 className={cn("mt-8 text-base font-medium text-balance text-ink", className)} {...props} />
  ),
}

// Never notifies — only here to satisfy useSyncExternalStore (see below).
function subscribe() {
  return () => {}
}

function changelogHref(tag: UpdateTagId | null, page = 1) {
  const params = new URLSearchParams()
  if (tag) params.set("tag", tag)
  if (page > 1) params.set("page", String(page))
  const query = params.toString()
  return query ? `${UPDATES.href}?${query}` : UPDATES.href
}

export default function UpdatesIndex() {
  const [searchParams] = useSearchParams()
  // The prerendered HTML is built without a query string, so it always shows
  // "All", page 1. getServerSnapshot keeps the first client render matching
  // that HTML; the ?tag= / ?page= filters apply right after hydration.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

  const rawTag = hydrated ? searchParams.get("tag") : null
  const activeTag = isUpdateTagId(rawTag) && TAGS.some((tag) => tag.id === rawTag) ? rawTag : null
  const filtered = activeTag ? ENTRIES.filter((entry) => entry.frontmatter.tagId === activeTag) : ENTRIES

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const rawPage = hydrated ? Number(searchParams.get("page") ?? "1") : 1
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= pageCount ? rawPage : 1
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <Section size="lg">
        {/* COPY: needs Curtis's approval */}
        <SectionHeading
          as="h1"
          eyebrow={<Eyebrow icon={UPDATES.icon}>Changelog</Eyebrow>}
          title="What’s new in Travada Books."
          lede="Product updates and company news, newest first. Each one says what changed and where to find it."
        />
        <div className="mt-8">
          <LearnMore to={`mailto:${CONTACT_EMAIL}`}>Tell us what to build next</LearnMore>
        </div>

        {TAGS.length > 1 ? (
          <nav aria-label="Filter updates" className="mt-12 flex flex-wrap gap-2">
            <TagPill to={changelogHref(null)} active={activeTag === null} label="All" count={ENTRIES.length} />
            {TAGS.map((tag) => (
              <TagPill
                key={tag.id}
                to={changelogHref(tag.id)}
                active={activeTag === tag.id}
                label={tag.label}
                count={tag.count}
              />
            ))}
          </nav>
        ) : null}
      </Section>

      <Section size="md">
        {visible.length > 0 ? (
          <div className="divide-y divide-line">
            {visible.map((entry) => (
              <ChangelogEntry key={entry.slug} entry={entry} />
            ))}
          </div>
        ) : (
          // COPY: needs Curtis's approval
          <EntryListEmpty title="No updates yet." body="When something ships, it's written up here." />
        )}

        {pageCount > 1 ? (
          <nav
            aria-label="Changelog pages"
            className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8"
          >
            {page > 1 ? (
              <Link
                to={changelogHref(activeTag, page - 1)}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-line-strong bg-panel text-sm")}
              >
                <ArrowLeft01Icon aria-hidden="true" />
                Newer updates
              </Link>
            ) : (
              <span />
            )}
            <p className="font-mono text-xs tracking-wide text-ink-subtle uppercase">
              Page {page} of {pageCount}
            </p>
            {page < pageCount ? (
              <Link
                to={changelogHref(activeTag, page + 1)}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-line-strong bg-panel text-sm")}
              >
                Older updates
                <ArrowRight01Icon aria-hidden="true" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </Section>
      <ClosingCta />
    </>
  )
}

// Filter pill. A link rather than a button so every filter is a shareable
// URL; switching is instant (no motion), and preventScrollReset keeps the
// reader where they are.
function TagPill({ to, active, label, count }: { to: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      to={to}
      replace
      preventScrollReset
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors active:opacity-80",
        active
          ? "border-ink bg-ink text-panel"
          : "border-line bg-panel text-ink-muted fine-hover:border-line-strong fine-hover:text-ink",
      )}
    >
      {label}
      <span className={cn("font-mono text-xs", active ? "text-panel/70" : "text-ink-subtle")}>{count}</span>
    </Link>
  )
}

// One changelog entry: a date rail (sticky from md) beside the post.
function ChangelogEntry({ entry }: { entry: UpdateEntry }) {
  const { slug, frontmatter, Component } = entry
  const href = `${UPDATES.href}/${slug}`

  return (
    <article
      id={slug}
      className="grid scroll-mt-24 gap-5 py-12 first:pt-0 last:pb-0 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12 md:py-16"
    >
      <div className="flex flex-wrap items-center gap-3 md:sticky md:top-24 md:flex-col md:items-start md:self-start">
        <time dateTime={frontmatter.publishedAt} className="font-mono text-xs tracking-wide text-ink uppercase">
          {formatDate(frontmatter.publishedAt)}
        </time>
        <Eyebrow variant="pill">{frontmatter.tag}</Eyebrow>
      </div>

      <div className="min-w-0 max-w-2xl">
        <h2 className="text-2xl font-medium tracking-tight text-balance text-ink md:text-3xl">
          <Link to={href} className="transition-colors active:opacity-80 fine-hover:text-brand">
            {frontmatter.title}
          </Link>
        </h2>

        {frontmatter.cover ? (
          <UpdateCover cover={frontmatter.cover} className="mt-8" />
        ) : frontmatter.image ? (
          <img
            src={frontmatter.image}
            alt={frontmatter.imageAlt ?? ""}
            loading="lazy"
            className="mt-8 w-full border border-line bg-panel"
          />
        ) : null}

        {frontmatter.inline ? (
          <div className={cn(MDX_BODY_CLASS, "mt-6 [&>:first-child]:mt-0")}>
            <Component components={changelogComponents} />
          </div>
        ) : (
          <>
            <p className="mt-6 text-base/7 text-pretty text-ink-muted md:text-lg/8">{frontmatter.summary}</p>
            <LearnMore to={href} className="mt-6">
              Read the full update
            </LearnMore>
          </>
        )}
      </div>
    </article>
  )
}
