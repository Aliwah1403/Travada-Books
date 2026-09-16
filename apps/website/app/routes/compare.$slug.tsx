import { Container } from "~/components/container"
import { mdxComponents } from "~/components/mdx-components"
import { NotFoundBody } from "~/components/not-found"
import { findEntry, type MdxModule } from "~/lib/content"
import { pageMeta } from "~/lib/seo"

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
  return pageMeta({
    title: `${frontmatter.title} — Travada Books`,
    description: frontmatter.summary,
    path: `/compare/${entry.slug}`,
    image: frontmatter.image ?? "/og/default.png",
    type: "article",
  })
}

export default function CompareDetail({ params }: Route.ComponentProps) {
  const entry = findEntry(modules, "compare", params.slug)
  if (!entry) return <NotFoundBody />

  const { Component, frontmatter } = entry

  return (
    <Container className="py-24">
      <p className="text-xs font-medium text-muted-foreground uppercase">{frontmatter.tag ?? "Compare"}</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight text-foreground">
        {frontmatter.title}
      </h1>
      <Component components={mdxComponents} />
    </Container>
  )
}
