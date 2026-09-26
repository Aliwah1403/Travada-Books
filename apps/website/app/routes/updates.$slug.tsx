import { data, isRouteErrorResponse } from "react-router"

import { ArticleLayout, ArticleMore } from "~/components/content/article-layout"
import { UPDATES } from "~/components/content/collections"
import { ClosingCta } from "~/components/home/closing"
import { mdxComponents } from "~/components/mdx-components"
import { NotFoundBody } from "~/components/not-found"
import { buildCollection, findEntry, readingMinutesBySlug, type MdxModule } from "~/lib/content"
import { formatDate } from "~/lib/date"
import { articleJsonLd, pageMeta } from "~/lib/seo"

import type { Route } from "./+types/updates.$slug"

const modules = import.meta.glob<MdxModule>("../../content/updates/*.mdx", {
  eager: true,
})
const minutes = readingMinutesBySlug(buildCollection(modules, "updates"))

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: loader + meta + default component
export function loader({ params }: Route.LoaderArgs) {
  const entry = findEntry(modules, "updates", params.slug)
  if (!entry) {
    throw data("Not found", { status: 404 })
  }
  return { slug: entry.slug }
}

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: loader + meta + default component
export function meta({ params }: Route.MetaArgs) {
  const entry = findEntry(modules, "updates", params.slug)
  if (!entry) {
    return pageMeta({
      title: "Not found — Travada Books",
      description: "The page you're looking for doesn't exist or may have moved.",
      path: `/updates/${params.slug}`,
      noindex: true,
    })
  }
  const { frontmatter } = entry
  const image = frontmatter.image ?? "/og/default.png"
  return [
    ...pageMeta({
      title: `${frontmatter.title} — Travada Books`,
      description: frontmatter.summary,
      path: `/updates/${entry.slug}`,
      image,
      type: "article",
    }),
    articleJsonLd({
      headline: frontmatter.title,
      description: frontmatter.summary,
      datePublished: frontmatter.publishedAt,
      dateModified: frontmatter.updatedAt,
      image,
    }),
  ]
}

// The loader throws a 404 Response for an unknown slug, which by default
// bubbles to React Router's generic error page — render the site's actual
// not-found UI instead.
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundBody />
  }
  throw error
}

export default function UpdateDetail({ params }: Route.ComponentProps) {
  const entry = findEntry(modules, "updates", params.slug)
  if (!entry) return <NotFoundBody />

  const { Component, frontmatter } = entry
  const date = frontmatter.updatedAt ?? frontmatter.publishedAt
  const readTime = minutes[entry.slug]
  const others = buildCollection(modules, "updates").filter((other) => other.slug !== entry.slug)

  return (
    <>
      <ArticleLayout
        collection={UPDATES}
        title={frontmatter.title}
        summary={frontmatter.summary}
        tag={frontmatter.tag}
        tocKey={entry.slug}
        byline={[
          "By Travada Systems",
          <>
            {frontmatter.updatedAt ? "Updated" : "Published"} <time dateTime={date}>{formatDate(date)}</time>
          </>,
          ...(readTime ? [`${readTime} min read`] : []),
        ]}
      >
        <Component components={mdxComponents} />
      </ArticleLayout>
      <ArticleMore
        collection={UPDATES}
        title="More updates"
        indexLabel="All updates"
        entries={others}
        minutes={minutes}
          variant="changelog"
      />
      <ClosingCta />
    </>
  )
}
