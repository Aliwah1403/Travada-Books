import { ArticleLayout, ArticleMore } from "~/components/content/article-layout"
import { GUIDES } from "~/components/content/collections"
import { ClosingCta } from "~/components/home/closing"
import { mdxComponents } from "~/components/mdx-components"
import { NotFoundBody } from "~/components/not-found"
import { buildCollection, findEntry, readingMinutesBySlug, type MdxModule } from "~/lib/content"
import { formatDate } from "~/lib/date"
import { articleJsonLd, pageMeta } from "~/lib/seo"

import type { Route } from "./+types/guides.$slug"

const modules = import.meta.glob<MdxModule>("../../content/guides/*.mdx", {
  eager: true,
})
const minutes = readingMinutesBySlug(buildCollection(modules, "guides"))

// No loader here: with `ssr:false`, a loader is only valid on a route that's
// actually in the prerender list. The guides collection is empty in batch 1,
// so this route is never prerendered for a real slug — content is looked up
// directly in the component instead. Once guides exist, prerendered slugs
// resolve fine either way. `meta` doesn't need a loader (params alone are
// enough), so it's safe to export here even without one.
// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta({ params }: Route.MetaArgs) {
  const entry = findEntry(modules, "guides", params.slug)
  if (!entry) {
    return pageMeta({
      title: "Not found — Travada Books",
      description: "The page you're looking for doesn't exist or may have moved.",
      path: `/guides/${params.slug}`,
      noindex: true,
    })
  }
  const { frontmatter } = entry
  const image = frontmatter.image ?? "/og/default.png"
  return [
    ...pageMeta({
      title: `${frontmatter.title} — Travada Books`,
      description: frontmatter.summary,
      path: `/guides/${entry.slug}`,
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

export default function GuideDetail({ params }: Route.ComponentProps) {
  const entry = findEntry(modules, "guides", params.slug)
  if (!entry) return <NotFoundBody />

  const { Component, frontmatter } = entry
  const date = frontmatter.updatedAt ?? frontmatter.publishedAt
  const readTime = minutes[entry.slug]
  const others = buildCollection(modules, "guides").filter((other) => other.slug !== entry.slug)

  return (
    <>
      <ArticleLayout
        collection={GUIDES}
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
        collection={GUIDES}
        title="More guides"
        indexLabel="All guides"
        entries={others}
        minutes={minutes}
      />
      <ClosingCta />
    </>
  )
}
