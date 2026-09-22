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
    <article data-dark-surface className="bg-[var(--website-paper)] text-[var(--website-ink)]">
      <header className="relative overflow-hidden border-b border-[var(--website-line)] bg-[linear-gradient(to_right,color-mix(in_oklab,var(--website-line)_75%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--website-line)_55%,transparent)_1px,transparent_1px)] pt-[7rem] pb-[5rem] [background-size:72px_72px] max-[640px]:pt-[5rem] max-[640px]:pb-[4rem]">
        <Container className="max-w-4xl">
          <p className="flex items-center gap-[.65rem] text-[.64rem] font-semibold uppercase leading-none tracking-[.11em] text-[var(--website-green)] font-sans"><span className="h-px w-[1.8rem] bg-current" />{frontmatter.tag ?? "Update"}</p>
          <h1 className="mt-[1.6rem] max-w-[52rem] text-[clamp(3.4rem,6.5vw,6.6rem)] leading-[.9] tracking-[-.073em] [font-weight:520] text-balance">{frontmatter.title}</h1>
          <p className="mt-[1.7rem] max-w-[43rem] text-[1.05rem] leading-[1.7] text-[color-mix(in_oklab,var(--website-ink)_62%,transparent)] font-heading">{frontmatter.summary}</p>
          <div className="mt-[2rem] flex flex-wrap gap-x-[1.5rem] gap-y-[.7rem] border-t border-[var(--website-line)] pt-[1rem] font-sans text-[.55rem] leading-none font-medium text-[color-mix(in_oklab,var(--website-ink)_48%,transparent)]"><span>By Travada Systems</span><span>Published {frontmatter.publishedAt}</span><span>Built in Nairobi</span></div>
        </Container>
      </header>
      <Container data-mdx-body className="max-w-3xl pt-[5rem] pb-[8rem] max-[640px]:pt-[4rem] max-[640px]:pb-[6rem]"><Component components={mdxComponents} /></Container>
    </article>
  )
}
