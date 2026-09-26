import { ClosingCta } from "~/components/home/closing"
import { COMPARE } from "~/components/content/collections"
import { EntryList, EntryListEmpty } from "~/components/content/entry-list"
import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"
import { SectionHeading } from "~/components/site/section-heading"
import { buildFrontmatterCollection, readingMinutesBySlug } from "~/lib/content"
import { pageMeta } from "~/lib/seo"

const modules = import.meta.glob<Record<string, unknown>>("../../content/compare/*.mdx", {
  eager: true,
  query: "?frontmatter",
  import: "frontmatter",
})

// COPY: needs Curtis's approval (title, description, heading and lede)
// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return pageMeta({
    title: "Compare Bookkeeping Options for Kenyan Businesses — Travada Books",
    description:
      "Balanced comparisons of spreadsheets, bookkeeping software and the other ways Kenyan freelancers and small businesses keep their books.",
    path: "/compare",
    image: "/og/default.png",
  })
}

export default function CompareIndex() {
  const comparisons = buildFrontmatterCollection(modules, "compare")
  const minutes = readingMinutesBySlug(comparisons)

  return (
    <>
      <Section size="lg">
        <SectionHeading
          as="h1"
          eyebrow={<Eyebrow icon={COMPARE.icon}>Compare</Eyebrow>}
          title="Weigh up the options."
          lede="Balanced comparisons of the ways Kenyan businesses keep their books, including when a spreadsheet is still the right tool."
        />
      </Section>
      <Section size="md" tone="canvas">
        {comparisons.length > 0 ? (
          <EntryList entries={comparisons} basePath={COMPARE.href} minutes={minutes} />
        ) : (
          <EntryListEmpty title="No comparisons yet." body="The first comparison is being written. It'll appear here." />
        )}
      </Section>
      <ClosingCta />
    </>
  )
}
