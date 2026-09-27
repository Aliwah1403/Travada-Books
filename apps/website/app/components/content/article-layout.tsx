import { useRef, type ReactNode } from "react"
import { Link } from "react-router"

import type { Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { ArticleToc } from "~/components/article-toc"
import { EntryList } from "~/components/content/entry-list"
import { LearnMore } from "~/components/home/shared"
import { MDX_BODY_CLASS, MDX_LEAD_CLASS } from "~/components/mdx-components"
import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"
import type { FrontmatterEntry } from "~/lib/content"

export type Collection = {
  /** Eyebrow label, e.g. "Guides". */
  label: string
  /** Index route, e.g. "/guides". */
  href: string
  icon: Icon
}

type ArticleLayoutProps = {
  collection: Collection
  title: string
  summary?: string
  /** Pill beside the eyebrow (frontmatter `tag`). */
  tag?: string
  /** Mono byline items under the header — author, date, read time. */
  byline: ReactNode[]
  /** Optional notice between the summary and the byline (legal drafts). */
  notice?: ReactNode
  /** Remount key for the TOC (the slug), so it re-reads headings per article. */
  tocKey: string
  /** Large first paragraph — on for articles, off for legal pages. */
  lead?: boolean
  /** Link the eyebrow to the collection index (off for legal pages). */
  eyebrowLink?: boolean
  /** The rendered MDX body. */
  children: ReactNode
}

// Shared shell for /guides/:slug, /updates/:slug and the
// legal pages: a framed header section, then the prose column with the
// sticky "On this page" rail beside it from lg. The header and body share
// one grid so the h1 and the first paragraph start on the same line.
const GRID = "grid gap-y-12 lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-x-16"

export function ArticleLayout({
  collection,
  title,
  summary,
  tag,
  byline,
  notice,
  tocKey,
  lead = true,
  eyebrowLink = true,
  children,
}: ArticleLayoutProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const eyebrow = <Eyebrow icon={collection.icon}>{collection.label}</Eyebrow>

  return (
    <article>
      <Section size="lg">
        <div className={GRID}>
          <header className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              {eyebrowLink ? (
                <Link
                  to={collection.href}
                  className="active:opacity-80 fine-hover:[&>span]:text-ink [&>span]:transition-colors"
                >
                  {eyebrow}
                </Link>
              ) : (
                eyebrow
              )}
              {tag ? <Eyebrow variant="pill">{tag}</Eyebrow> : null}
            </div>
            <h1 className="mt-6 text-4xl font-medium tracking-tight text-balance md:text-5xl">{title}</h1>
            {summary ? <p className="mt-6 max-w-2xl text-lg text-pretty text-ink-muted">{summary}</p> : null}
            {notice ? <div className="mt-8 max-w-2xl">{notice}</div> : null}
            <p className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 font-mono text-xs tracking-wide text-ink-subtle uppercase">
              {byline.map((item, index) => (
                <span key={index}>{item}</span>
              ))}
            </p>
          </header>
        </div>
      </Section>

      <Section size="lg">
        <div className={GRID}>
          <div ref={bodyRef} className={cn(MDX_BODY_CLASS, lead && MDX_LEAD_CLASS, "max-w-2xl")}>
            {children}
          </div>
          <ArticleToc key={tocKey} containerRef={bodyRef} />
        </div>
      </Section>
    </article>
  )
}

type ArticleMoreProps = {
  collection: Collection
  /** e.g. "More guides". */
  title: string
  /** Link text back to the index, e.g. "All guides". */
  indexLabel: string
  /** Other entries in the collection (the current one already removed). */
  entries: FrontmatterEntry[]
  minutes?: Record<string, number>
  variant?: "list" | "changelog"
}

// "More …" block under an article: up to three other entries plus a link
// back to the index. With nothing else published it is just the link.
export function ArticleMore({ collection, title, indexLabel, entries, minutes, variant }: ArticleMoreProps) {
  const others = entries.slice(0, 3)
  return (
    <Section size="md" tone="canvas">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {others.length > 0 ? (
          <h2 className="text-2xl font-medium tracking-tight md:text-3xl">{title}</h2>
        ) : null}
        <LearnMore to={collection.href}>{indexLabel}</LearnMore>
      </div>
      {others.length > 0 ? (
        <EntryList
          entries={others}
          basePath={collection.href}
          minutes={minutes}
          variant={variant}
          headingLevel="h3"
          className="mt-8"
        />
      ) : null}
    </Section>
  )
}
