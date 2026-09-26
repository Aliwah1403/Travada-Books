import Terms, { frontmatter } from "../../content/legal/terms.mdx"
import { ArticleLayout } from "~/components/content/article-layout"
import { LEGAL } from "~/components/content/collections"
import { LegalDraftNotice } from "~/components/content/legal-draft-notice"
import { mdxComponents } from "~/components/mdx-components"
import { formatDate } from "~/lib/date"
import { pageMeta } from "~/lib/seo"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return pageMeta({
    title: `${frontmatter.title} — Travada Books`,
    description: frontmatter.summary,
    path: "/legal/terms",
    noindex: frontmatter.placeholder,
  })
}

export default function LegalTerms() {
  const date = frontmatter.updatedAt ?? frontmatter.publishedAt
  return (
    <ArticleLayout
      collection={LEGAL}
      eyebrowLink={false}
      lead={false}
      title={frontmatter.title}
      tocKey="terms"
      notice={
        frontmatter.placeholder ? (
          <LegalDraftNotice>
            This page is a placeholder and will be replaced with the final terms before launch.
          </LegalDraftNotice>
        ) : undefined
      }
      byline={[
        <>
          Last updated <time dateTime={date}>{formatDate(date)}</time>
        </>,
      ]}
    >
      <Terms components={mdxComponents} />
    </ArticleLayout>
  )
}
