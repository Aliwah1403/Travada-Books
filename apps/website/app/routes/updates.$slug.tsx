import { data, isRouteErrorResponse } from "react-router"

import { Container } from "~/components/container"
import { mdxComponents } from "~/components/mdx-components"
import { NotFoundBody } from "~/components/not-found"
import { findEntry, type MdxModule } from "~/lib/content"
import { articleJsonLd, pageMeta } from "~/lib/seo"

import type { Route } from "./+types/updates.$slug"

const modules = import.meta.glob<MdxModule>("../../content/updates/*.mdx", {
  eager: true,
})

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

  return (
    <article className="content-article">
      <header className="content-article__header">
        <Container className="max-w-4xl">
          <p className="section-kicker"><span />{frontmatter.tag ?? "Update"}</p>
          <h1>{frontmatter.title}</h1>
          <p className="content-article__summary">{frontmatter.summary}</p>
          <div className="content-article__byline"><span>By Travada Systems</span><span>Published {frontmatter.publishedAt}</span><span>Built in Nairobi</span></div>
        </Container>
      </header>
      <Container className="content-article__body max-w-3xl"><Component components={mdxComponents} /></Container>
    </article>
  )
}
