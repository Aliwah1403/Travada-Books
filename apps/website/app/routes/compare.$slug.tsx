import { Container } from "~/components/container"
import { mdxComponents } from "~/components/mdx-components"
import { NotFoundBody } from "~/components/not-found"
import { findEntry, type MdxModule } from "~/lib/content"
import { articleJsonLd, pageMeta } from "~/lib/seo"

import type { Route } from "./+types/compare.$slug"

const modules = import.meta.glob<MdxModule>("../../content/compare/*.mdx", {
  eager: true,
})

// See guides.$slug.tsx for why there's no loader: with ssr:false, a loader
// is only valid on a route that's actually in the prerender list, and the
// compare collection is empty in batch 1. `meta` doesn't need a loader.
// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta({ params }: Route.MetaArgs) {
  const entry = findEntry(modules, "compare", params.slug)
  if (!entry) {
    return pageMeta({
      title: "Not found — Travada Books",
      description: "The page you're looking for doesn't exist or may have moved.",
      path: `/compare/${params.slug}`,
      noindex: true,
    })
  }
  const { frontmatter } = entry
  const image = frontmatter.image ?? "/og/default.png"
  return [
    ...pageMeta({
      title: `${frontmatter.title} — Travada Books`,
      description: frontmatter.summary,
      path: `/compare/${entry.slug}`,
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

export default function CompareDetail({ params }: Route.ComponentProps) {
  const entry = findEntry(modules, "compare", params.slug)
  if (!entry) return <NotFoundBody />

  const { Component, frontmatter } = entry

  return (
    <article className="content-article">
      <header className="content-article__header">
        <Container className="max-w-4xl">
          <p className="section-kicker"><span />{frontmatter.tag ?? "Compare"}</p>
          <h1>{frontmatter.title}</h1>
          <p className="content-article__summary">{frontmatter.summary}</p>
          <div className="content-article__byline"><span>By Travada Systems</span><span>Updated {frontmatter.updatedAt ?? frontmatter.publishedAt}</span><span>Balanced comparison</span></div>
        </Container>
      </header>
      <Container className="content-article__body max-w-3xl"><Component components={mdxComponents} /></Container>
    </article>
  )
}
