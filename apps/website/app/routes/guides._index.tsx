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
    <div className="content-index">
      <div className="content-index__grid" aria-hidden="true" />
      <Container className="relative max-w-7xl py-24 md:py-32">
        <p className="section-kicker"><span />Field notes</p>
        <h1>Practical guides for<br />running the books.</h1>
        <p className="content-index__intro">Straight, sourced answers on invoicing, M-Pesa statements, eTIMS and keeping business records in Kenya.</p>

        <ul className="content-index__list">
          {guides.map((entry) => (
            <li key={entry.slug}>
              <Link to={`/guides/${entry.slug}`}>
                <span>{entry.frontmatter.tag ?? "Guide"}</span>
                <h2>{entry.frontmatter.title}</h2>
                <p>{entry.frontmatter.summary}</p>
                <small>Updated {entry.frontmatter.updatedAt ?? entry.frontmatter.publishedAt} <b>↗</b></small>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </div>
  )
}
