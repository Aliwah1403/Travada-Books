import Privacy, { frontmatter } from "../../content/legal/privacy.mdx"
import { Container } from "~/components/container"
import { mdxComponents } from "~/components/mdx-components"
import { formatDate } from "~/lib/date"
import { pageMeta } from "~/lib/seo"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return pageMeta({
    title: `${frontmatter.title} — Travada Books`,
    description: frontmatter.summary,
    path: "/legal/privacy",
    noindex: frontmatter.placeholder,
  })
}

export default function LegalPrivacy() {
  return (
    <Container className="py-24">
      {frontmatter.placeholder && (
        <div className="mb-8 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-xs font-medium text-amber-700 uppercase dark:text-amber-400">
            Draft — placeholder
          </p>
          <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80">
            This page is a placeholder and will be replaced with the final privacy policy before
            launch.
          </p>
        </div>
      )}
      <h1 className="text-3xl font-medium tracking-tight text-foreground">{frontmatter.title}</h1>
      <p className="mt-2 text-xs text-muted-foreground">
        Last updated {formatDate(frontmatter.updatedAt ?? frontmatter.publishedAt)}
      </p>
      <Privacy components={mdxComponents} />
    </Container>
  )
}
