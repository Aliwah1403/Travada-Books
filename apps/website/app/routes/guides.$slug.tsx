import { Container } from "~/components/container"
import { mdxComponents } from "~/components/mdx-components"
import { NotFoundBody } from "~/components/not-found"
import { findEntry, type MdxModule } from "~/lib/content"
import { articleJsonLd, pageMeta } from "~/lib/seo"

import type { Route } from "./+types/guides.$slug"

const modules = import.meta.glob<MdxModule>("../../content/guides/*.mdx", {
  eager: true,
})

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

  return (
    <Container className="py-24">
      <p className="text-xs font-medium text-muted-foreground uppercase">{frontmatter.tag ?? "Guide"}</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight text-foreground">
        {frontmatter.title}
      </h1>
      <Component components={mdxComponents} />
    </Container>
  )
}
