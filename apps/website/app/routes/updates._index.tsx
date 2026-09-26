import { ClosingCta } from "~/components/home/closing"
import { UPDATES } from "~/components/content/collections"
import { EntryList, EntryListEmpty } from "~/components/content/entry-list"
import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"
import { SectionHeading } from "~/components/site/section-heading"
import { buildFrontmatterCollection, readingMinutesBySlug } from "~/lib/content"
import { pageMeta } from "~/lib/seo"

const modules = import.meta.glob<Record<string, unknown>>("../../content/updates/*.mdx", {
  eager: true,
  query: "?frontmatter",
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
  const minutes = readingMinutesBySlug(updates)

  return (
    <>
      <Section size="lg">
        <SectionHeading
          as="h1"
          eyebrow={<Eyebrow icon={UPDATES.icon}>Product updates</Eyebrow>}
          title="What we’ve been building."
          lede="New features, product decisions, and improvements—published as they become useful."
        />
      </Section>
      <Section size="md" tone="canvas">
        {updates.length > 0 ? (
          <EntryList entries={updates} basePath={UPDATES.href} minutes={minutes} variant="changelog" />
        ) : (
          // COPY: needs Curtis's approval
          <EntryListEmpty title="No updates yet." body="When something ships, it's written up here." />
        )}
      </Section>
      <ClosingCta />
    </>
  )
}
