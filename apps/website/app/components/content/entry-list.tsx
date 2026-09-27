import { Link } from "react-router"

import { ArrowRight01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import type { FrontmatterEntry } from "~/lib/content"
import { formatDate } from "~/lib/date"

type EntryListProps = {
  entries: FrontmatterEntry[]
  /** Route prefix for each entry, e.g. "/guides". */
  basePath: string
  /** Read time per slug (frontmatter `readingTime`, see vite.config.ts). */
  minutes?: Record<string, number>
  /** `changelog` — a date column beside each entry (/updates). */
  variant?: "list" | "changelog"
  /** h2 on an index page; h3 under a "More …" h2 on an article. */
  headingLevel?: "h2" | "h3"
  className?: string
}

const META = "font-mono text-xs tracking-wide text-ink-subtle uppercase"

// Hairline list of MDX entries — /guides, /updates and the
// "More …" block under each article. Whole row is the link; rows are never
// scaled (CLAUDE.md), only a background tint and an opacity press.
export function EntryList({
  entries,
  basePath,
  minutes,
  variant = "list",
  headingLevel: Heading = "h2",
  className,
}: EntryListProps) {
  return (
    <ul className={cn("divide-y divide-line border border-line bg-panel", className)}>
      {entries.map((entry) => {
        const { frontmatter } = entry
        const readTime = minutes?.[entry.slug]
        const date = frontmatter.updatedAt ?? frontmatter.publishedAt
        return (
          <li key={entry.slug}>
            <Link
              to={`${basePath}/${entry.slug}`}
              className={cn(
                "grid gap-4 p-6 transition-colors active:opacity-80 fine-hover:bg-canvas md:gap-10 md:p-8",
                "fine-hover:[&_[data-arrow]]:translate-x-0.5 fine-hover:[&_[data-arrow]]:text-ink",
                variant === "changelog"
                  ? "md:grid-cols-[10rem_minmax(0,1fr)_auto]"
                  : "md:grid-cols-[minmax(0,1fr)_auto]",
              )}
            >
              {variant === "changelog" ? (
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 md:flex-col md:gap-y-2">
                  <time dateTime={frontmatter.publishedAt} className="font-mono text-xs tracking-wide text-ink uppercase">
                    {formatDate(frontmatter.publishedAt)}
                  </time>
                  {frontmatter.tag ? <span className={META}>{frontmatter.tag}</span> : null}
                </div>
              ) : null}

              <div className="min-w-0">
                {variant === "list" && frontmatter.tag ? <p className={META}>{frontmatter.tag}</p> : null}
                <Heading
                  className={cn(
                    "text-xl font-medium tracking-tight text-balance text-ink md:text-2xl",
                    variant === "list" && frontmatter.tag && "mt-3",
                  )}
                >
                  {frontmatter.title}
                </Heading>
                <p className="mt-2 max-w-2xl text-base text-pretty text-ink-muted">{frontmatter.summary}</p>
                {variant === "list" || readTime ? (
                  <p className={cn(META, "mt-4 flex flex-wrap gap-x-4 gap-y-1")}>
                    {variant === "list" ? (
                      <span>
                        Updated <time dateTime={date}>{formatDate(date)}</time>
                      </span>
                    ) : null}
                    {readTime ? <span>{readTime} min read</span> : null}
                  </p>
                ) : null}
              </div>

              <ArrowRight01Icon
                data-arrow=""
                aria-hidden="true"
                className="hidden size-5 text-ink-subtle transition-[color,transform] duration-150 [transition-timing-function:var(--ease-out)] md:mt-1 md:block"
              />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

// Shown when a collection has no published entries. The entrance runs once
// on mount (CLAUDE.md "Empty states").
export function EntryListEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="animate-in border border-dashed border-line-strong bg-panel px-6 py-16 text-center duration-300 fade-in-0 slide-in-from-bottom-2 [animation-timing-function:var(--ease-out)]">
      <p className="text-lg font-medium text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-base text-pretty text-ink-muted">{body}</p>
    </div>
  )
}
