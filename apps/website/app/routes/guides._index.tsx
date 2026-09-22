import { Link } from "react-router"

import { Container } from "~/components/container"
import { buildFrontmatterCollection } from "~/lib/content"
import { pageMeta } from "~/lib/seo"

const modules = import.meta.glob<Record<string, unknown>>("../../content/guides/*.mdx", {
  eager: true,
  import: "frontmatter",
})

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return pageMeta({
    title: "Small Business Invoicing & Bookkeeping Guides — Kenya",
    description: "Practical, sourced guides on eTIMS, M-Pesa statements, recurring invoices and bookkeeping for freelancers and small businesses in Kenya.",
    path: "/guides",
  })
}

export default function GuidesIndex() {
  const guides = buildFrontmatterCollection(modules, "guides")

  return (
    <div data-dark-surface className="relative min-h-[70vh] overflow-hidden bg-[var(--website-paper)] text-[var(--website-ink)]">
      <div className="content-index__grid" aria-hidden="true" />
      <Container className="relative max-w-7xl py-24 md:py-32">
        <p className="flex items-center gap-[.65rem] text-[.64rem] font-semibold uppercase leading-none tracking-[.11em] text-[var(--website-green)] font-sans"><span className="h-px w-[1.8rem] bg-current" />Field notes</p>
        <h1 className="mt-[1.6rem] max-w-[58rem] text-[clamp(3.7rem,7vw,7rem)] leading-[.88] tracking-[-.075em] [font-weight:520]">Practical guides for<br />running the books.</h1>
        <p className="mt-[1.8rem] max-w-[38rem] text-[1rem] leading-[1.7] text-[color-mix(in_oklab,var(--website-ink)_58%,transparent)] font-heading">Straight, sourced answers on invoicing, M-Pesa statements, eTIMS and keeping business records in Kenya.</p>

        <ul className="mt-[5rem] grid grid-cols-3 border border-[var(--website-line)] bg-[var(--website-paper)] max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
          {guides.map((entry) => (
            <li
              key={entry.slug}
              className="border-r border-[var(--website-line)] min-[901px]:[&:nth-child(3n)]:border-r-0 min-[641px]:max-[900px]:[&:nth-child(2n)]:border-r-0 max-[640px]:border-r-0 max-[640px]:border-b max-[640px]:last:border-b-0"
            >
              <Link
                to={`/guides/${entry.slug}`}
                className="flex min-h-[25rem] flex-col p-[1.8rem] transition-[background,transform] duration-[250ms] [transition-timing-function:var(--ease-out)] fine-hover:-translate-y-[4px] fine-hover:bg-[color-mix(in_oklab,var(--website-green)_6%,var(--website-paper))] max-[640px]:min-h-[21rem]"
              >
                <span className="text-[var(--website-green)] font-sans text-[.55rem] font-semibold leading-none tracking-[.09em] uppercase">{entry.frontmatter.tag ?? "Guide"}</span>
                <h2 className="mt-[5rem] text-[1.5rem] leading-[1.05] tracking-[-.045em] [font-weight:560]">{entry.frontmatter.title}</h2>
                <p className="mt-[1rem] text-[color-mix(in_oklab,var(--website-ink)_55%,transparent)] font-heading text-[.78rem] leading-[1.6]">{entry.frontmatter.summary}</p>
                <small className="mt-auto flex justify-between text-[color-mix(in_oklab,var(--website-ink)_44%,transparent)] font-sans text-[.48rem] font-medium leading-none">Updated {entry.frontmatter.updatedAt ?? entry.frontmatter.publishedAt} <b className="text-[.8rem] text-[var(--website-green)]">↗</b></small>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </div>
  )
}
