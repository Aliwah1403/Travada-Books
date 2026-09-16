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
    title: "Updates — Travada Books",
    description: "What's shipped recently on Travada Books, as it ships.",
    path: "/updates",
  })
}

export default function UpdatesIndex() {
  const updates = buildFrontmatterCollection(modules, "updates")

  return (
    <Container className="py-24">
      <h1 className="text-3xl font-medium tracking-tight text-foreground">Updates</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        What's shipped recently, as it ships.
      </p>

      <ul className="mt-10 flex flex-col gap-4">
        {updates.map((entry) => (
          <li key={entry.slug}>
            <Link to={`/updates/${entry.slug}`} className="text-sm text-primary underline">
              {entry.frontmatter.title}
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  )
}
