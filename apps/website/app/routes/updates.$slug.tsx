import { data, isRouteErrorResponse } from "react-router"

import { ArticleLayout, ArticleMore } from "~/components/content/article-layout"
import { UPDATES } from "~/components/content/collections"
import { ClosingCta } from "~/components/home/closing"
import { mdxComponents } from "~/components/mdx-components"
import { NotFoundBody } from "~/components/not-found"
import { UpdateCover } from "~/components/updates/covers"
import { readingMinutesBySlug, type MdxModule } from "~/lib/content"
import { formatDate } from "~/lib/date"
import { articleJsonLd, pageMeta } from "~/lib/seo"
import { buildUpdates, findUpdate } from "~/lib/updates"

import type { Route } from "./+types/updates.$slug"

const modules = import.meta.glob<MdxModule>("../../content/updates/*.mdx", {
  eager: true,
})
const minutes = readingMinutesBySlug(buildUpdates(modules))

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: loader + meta + default component
export function loader({ params }: Route.LoaderArgs) {
  const entry = findUpdate(modules, params.slug)
  if (!entry) {
    throw data("Not found", { status: 404 })
  }
  return { slug: entry.slug }
}

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: loader + meta + default component
export function meta({ params }: Route.MetaArgs) {
  const entry = findUpdate(modules, params.slug)
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
  const entry = findUpdate(modules, params.slug)
  if (!entry) return <NotFoundBody />

  const { Component, frontmatter } = entry
  const readTime = minutes[entry.slug]
  const others = buildUpdates(modules).filter((other) => other.slug !== entry.slug)

  return (
    <>
      <ArticleLayout
        collection={{ ...UPDATES, label: "Changelog" }}
        title={frontmatter.title}
        summary={frontmatter.summary}
        tag={frontmatter.tag}
        tocKey={entry.slug}
        byline={[
          <time dateTime={frontmatter.publishedAt}>
            {formatDate(frontmatter.publishedAt)}
          </time>,
          ...(frontmatter.updatedAt && frontmatter.updatedAt !== frontmatter.publishedAt
            ? [
                <>
                  Updated <time dateTime={frontmatter.updatedAt}>{formatDate(frontmatter.updatedAt)}</time>
                </>,
              ]
            : []),
          "By Travada Systems",
          ...(readTime ? [`${readTime} min read`] : []),
        ]}
      >
        {frontmatter.cover ? <UpdateCover cover={frontmatter.cover} className="mb-10" /> : null}
        <Component components={mdxComponents} />
      </ArticleLayout>
      <ArticleMore
        collection={UPDATES}
        title="More updates"
        indexLabel="Back to the changelog"
        entries={others}
        minutes={minutes}
        variant="changelog"
      />
      <ClosingCta />
    </>
  )
}
