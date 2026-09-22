import { Link } from "react-router"

import { Container } from "~/components/container"
import { buildFrontmatterCollection } from "~/lib/content"
import { pageMeta } from "~/lib/seo"

const modules = import.meta.glob<Record<string, unknown>>("../../content/updates/*.mdx", {
  eager: true,
  import: "frontmatter",
})

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return pageMeta({
    title: "Product Updates — Travada Books",
    description: "New features, improvements and product decisions from the team building Travada Books in Nairobi.",
    path: "/updates",
  })
}

export default function UpdatesIndex() {
  const updates = buildFrontmatterCollection(modules, "updates")

  return (
    <div data-dark-surface className="min-h-[70vh] bg-[var(--website-paper)] text-[var(--website-ink)]">
      <Container className="max-w-5xl py-24 md:py-32">
        <p className="flex items-center gap-[.65rem] text-[.64rem] font-semibold uppercase leading-none tracking-[.11em] text-[var(--website-green)] font-sans"><span className="h-px w-[1.8rem] bg-current" />Product updates</p>
        <h1 className="mt-[1.6rem] text-[clamp(4rem,7vw,7rem)] leading-[.88] tracking-[-.075em] [font-weight:520]">What we’ve been<br />building.</h1>
        <p className="mt-[1.8rem] max-w-[38rem] text-[1rem] leading-[1.7] text-[color-mix(in_oklab,var(--website-ink)_58%,transparent)] font-heading">New features, product decisions, and improvements—published as they become useful.</p>

        <div className="mt-[5rem] border-t border-[var(--website-line)]">
          {updates.map((entry) => (
            <article
              key={entry.slug}
              className="grid grid-cols-[12rem_1fr] gap-[3rem] border-b border-[var(--website-line)] py-[3rem] max-[640px]:grid-cols-1 max-[640px]:gap-[1.5rem]"
            >
              <div className="flex flex-col gap-[.65rem] font-sans text-[.54rem] leading-none font-medium uppercase tracking-[.07em] text-[color-mix(in_oklab,var(--website-ink)_45%,transparent)] max-[640px]:flex-row max-[640px]:justify-between">
                <span className="text-[var(--website-green)]">{entry.frontmatter.tag ?? "Update"}</span><time>{entry.frontmatter.publishedAt}</time>
              </div>
              <Link to={`/updates/${entry.slug}`} className="block">
                <h2 className="text-[clamp(2rem,3.6vw,3.5rem)] leading-none tracking-[-.058em] [font-weight:540]">{entry.frontmatter.title}</h2>
                <p className="mt-[1rem] max-w-[42rem] text-[.9rem] leading-[1.65] text-[color-mix(in_oklab,var(--website-ink)_57%,transparent)] font-heading">{entry.frontmatter.summary}</p>
                <small className="mt-[2rem] inline-flex items-center gap-[.5rem] text-[var(--website-green)] font-sans text-[.6rem] font-semibold leading-none">Read update <b className="text-[.8rem]">↗</b></small>
              </Link>
            </article>
          ))}
        </div>
      </Container>
    </div>
  )
}
