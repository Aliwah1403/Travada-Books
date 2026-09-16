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
    title: "Guides — Travada Books",
    description: "Straight answers on eTIMS, M-Pesa statements and running the books in Kenya.",
    path: "/guides",
  })
}

export default function GuidesIndex() {
  const guides = buildFrontmatterCollection(modules, "guides")

  return (
    <Container className="py-24">
      <h1 className="text-3xl font-medium tracking-tight text-foreground">Guides</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Straight answers on eTIMS, M-Pesa statements and running the books in Kenya.
      </p>

      {guides.length > 0 && (
        <ul className="mt-10 flex flex-col gap-4">
          {guides.map((entry) => (
            <li key={entry.slug}>
              <Link to={`/guides/${entry.slug}`} className="text-sm text-primary underline">
                {entry.frontmatter.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}
