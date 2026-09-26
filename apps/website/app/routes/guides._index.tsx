import { ClosingCta } from "~/components/home/closing"
import { GUIDES } from "~/components/content/collections"
import { EntryList, EntryListEmpty } from "~/components/content/entry-list"
import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"
import { SectionHeading } from "~/components/site/section-heading"
import { buildFrontmatterCollection, readingMinutesBySlug } from "~/lib/content"
import { pageMeta } from "~/lib/seo"

const modules = import.meta.glob<Record<string, unknown>>("../../content/guides/*.mdx", {
  eager: true,
  query: "?frontmatter",
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
  const minutes = readingMinutesBySlug(guides)

  return (
    <>
      <Section size="lg">
        <SectionHeading
          as="h1"
          eyebrow={<Eyebrow icon={GUIDES.icon}>Guides</Eyebrow>}
          title="Practical guides for running the books."
          lede="Straight, sourced answers on invoicing, M-Pesa statements, eTIMS and keeping business records in Kenya."
        />
      </Section>
      <Section size="md" tone="canvas">
        {guides.length > 0 ? (
          <EntryList entries={guides} basePath={GUIDES.href} minutes={minutes} />
        ) : (
          // COPY: needs Curtis's approval
          <EntryListEmpty title="No guides yet." body="The first guides are being written and checked. They'll appear here." />
        )}
      </Section>
      <ClosingCta />
    </>
  )
}
