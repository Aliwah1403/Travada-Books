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
    <div className="updates-index">
      <Container className="max-w-5xl py-24 md:py-32">
        <p className="section-kicker"><span />Product updates</p>
        <h1>What we’ve been<br />building.</h1>
        <p className="updates-index__intro">New features, product decisions, and improvements—published as they become useful.</p>

        <div className="updates-feed">
          {updates.map((entry) => (
            <article key={entry.slug}>
              <div className="updates-feed__meta"><span>{entry.frontmatter.tag ?? "Update"}</span><time>{entry.frontmatter.publishedAt}</time></div>
              <Link to={`/updates/${entry.slug}`}>
                <h2>{entry.frontmatter.title}</h2>
                <p>{entry.frontmatter.summary}</p>
                <small>Read update <b>↗</b></small>
              </Link>
            </article>
          ))}
        </div>
      </Container>
    </div>
  )
}
