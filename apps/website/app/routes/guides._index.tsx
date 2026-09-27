import { Link } from "react-router"

import { ArrowRight01Icon, Doc01Icon, Mail01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { UPDATES } from "~/components/content/collections"
import { EntryList } from "~/components/content/entry-list"
import { HelpSearch, SoonPill } from "~/components/help/help-search"
import { ClosingCta } from "~/components/home/closing"
import { LearnMore } from "~/components/home/shared"
import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"
import { buildHelpCentre, type HelpArticle, type HelpCategoryWithArticles } from "~/data/help"
import { CONTACT_EMAIL } from "~/data/site"
import { buildFrontmatterCollection } from "~/lib/content"
import { pageMeta } from "~/lib/seo"

const guideModules = import.meta.glob<Record<string, unknown>>("../../content/guides/*.mdx", {
  eager: true,
  query: "?frontmatter",
  import: "frontmatter",
})
const updateModules = import.meta.glob<Record<string, unknown>>("../../content/updates/*.mdx", {
  eager: true,
  query: "?frontmatter",
  import: "frontmatter",
})

// Built once at module load: the frontmatter globs are static.
const CATEGORIES = buildHelpCentre(buildFrontmatterCollection(guideModules, "guides"))
const ARTICLES = CATEGORIES.flatMap((category) => category.articles)
const CATEGORY_TITLES = Object.fromEntries(CATEGORIES.map((category) => [category.id, category.title]))
const POPULAR = ARTICLES.filter((article) => article.popular && article.written)
const LATEST_UPDATES = buildFrontmatterCollection(updateModules, "updates").slice(0, 3)

// COPY: needs Curtis's approval
const POPULAR_SEARCHES = ["Recurring invoice", "Import statement", "Record payment", "Gmail"]

const META = "font-mono text-xs tracking-wide text-ink-subtle uppercase"
// Clickable rows and cards: tint + opacity press, never a scale (CLAUDE.md).
const PRESSABLE = "transition-colors active:opacity-80 fine-hover:bg-canvas"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return pageMeta({
    title: "Help Centre — How to Use Travada Books",
    description:
      "Step-by-step help for Travada Books: set up your business, send invoices and quotes, import statements, record payments and manage your team. Plus guides for running a business in Kenya.",
    path: "/guides",
  })
}

function countLabel({ writtenCount, soonCount }: HelpCategoryWithArticles) {
  const parts: string[] = []
  if (writtenCount > 0) parts.push(`${writtenCount} ${writtenCount === 1 ? "article" : "articles"}`)
  if (soonCount > 0) parts.push(`${soonCount} coming soon`)
  return parts.join(" · ")
}

function IconBox({ category, className }: { category: HelpCategoryWithArticles; className?: string }) {
  const { icon: CategoryIcon } = category
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-10 shrink-0 items-center justify-center border border-line bg-panel", className)}
    >
      <CategoryIcon className="size-5 text-brand-line" />
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* Hero + search                                                              */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <Section innerClassName="py-14 md:py-20">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <Eyebrow icon={Doc01Icon}>Help centre</Eyebrow>
        {/* COPY: needs Curtis's approval */}
        <h1 className="mt-5 text-5xl font-medium tracking-tight text-balance md:text-6xl">How can we help?</h1>
        <p className="mt-5 max-w-2xl text-lg text-pretty text-ink-muted">
          Step-by-step help with every part of Travada Books, and longer guides on keeping business records in
          Kenya.
        </p>
        <div className="mt-8 w-full md:mt-10">
          <HelpSearch
            articles={ARTICLES}
            categoryTitles={CATEGORY_TITLES}
            popularSearches={POPULAR_SEARCHES}
            contactEmail={CONTACT_EMAIL}
          />
        </div>
      </div>
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/* Category cards                                                             */
/* -------------------------------------------------------------------------- */

function CategoryCards() {
  // 11 categories + a contact card = a full 3-column (and 2-column) grid.
  return (
    <Section size="md" tone="canvas">
      <h2 className="sr-only">Browse by topic</h2>
      <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((category) => (
          <li key={category.id} className="flex">
            <a
              href={`#${category.id}`}
              className={cn("flex w-full gap-4 bg-panel p-5 sm:flex-col sm:gap-0 sm:p-6", PRESSABLE)}
            >
              <IconBox category={category} />
              {/* Icon beside the text on phones, above it from sm. */}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-lg font-medium text-ink sm:mt-6">{category.title}</span>
                <span className="mt-1.5 text-sm text-pretty text-ink-muted">{category.description}</span>
                <span className={cn(META, "mt-auto pt-4 sm:pt-6")}>{countLabel(category)}</span>
              </span>
            </a>
          </li>
        ))}
        <li className="flex">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className={cn("flex w-full gap-4 bg-panel p-5 sm:flex-col sm:gap-0 sm:p-6", PRESSABLE)}
          >
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center border border-dashed border-line-strong text-ink-subtle"
            >
              <Mail01Icon className="size-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              {/* COPY: needs Curtis's approval */}
              <span className="text-lg font-medium text-ink sm:mt-6">Ask a person</span>
              <span className="mt-1.5 text-sm text-pretty text-ink-muted">
                Can&rsquo;t find it here? Email us and someone from the team will reply.
              </span>
              <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-medium text-brand sm:pt-6">
                {CONTACT_EMAIL} <ArrowRight01Icon className="size-4" aria-hidden="true" />
              </span>
            </span>
          </a>
        </li>
      </ul>
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/* Popular articles                                                           */
/* -------------------------------------------------------------------------- */

function PopularArticles() {
  if (POPULAR.length === 0) return null
  return (
    <Section size="md">
      <h2 className="text-3xl font-medium tracking-tight text-balance md:text-4xl">Popular articles</h2>
      <ul className="mt-8 grid border-t border-line md:mt-10 md:grid-cols-2 md:gap-x-10">
        {POPULAR.map((article) => (
          <li key={article.slug} className="border-b border-line">
            <Link
              to={`/guides/${article.slug}`}
              className={cn(
                "group flex items-center gap-4 py-4 active:opacity-80",
                "fine-hover:[&_[data-title]]:text-brand fine-hover:[&_[data-arrow]]:translate-x-0.5 fine-hover:[&_[data-arrow]]:text-ink",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className={cn(META, "block")}>{CATEGORY_TITLES[article.category]}</span>
                <span data-title="" className="mt-1 block text-base font-medium text-ink transition-colors">
                  {article.title}
                </span>
              </span>
              <ArrowRight01Icon
                data-arrow=""
                aria-hidden="true"
                className="size-4 shrink-0 text-ink-subtle transition-[color,transform] duration-150 [transition-timing-function:var(--ease-out)]"
              />
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/* All categories                                                             */
/* -------------------------------------------------------------------------- */

function ArticleRow({ article, longform }: { article: HelpArticle; longform?: boolean }) {
  if (!article.written) {
    return (
      <li className="flex items-start gap-4 bg-panel px-5 py-4 md:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium text-ink-muted">{article.title}</p>
          <p className="mt-1 text-sm text-pretty text-ink-subtle">{article.summary}</p>
        </div>
        <SoonPill className="mt-0.5" />
      </li>
    )
  }

  return (
    <li className="flex">
      <Link
        to={`/guides/${article.slug}`}
        className={cn(
          "flex w-full items-start gap-4 bg-panel px-5 py-4 md:px-6",
          longform && "py-6 md:py-7",
          PRESSABLE,
          "fine-hover:[&_[data-arrow]]:translate-x-0.5 fine-hover:[&_[data-arrow]]:text-ink",
        )}
      >
        <div className="min-w-0 flex-1">
          {longform && article.tag ? <p className={META}>{article.tag}</p> : null}
          <p
            className={cn(
              "font-medium text-ink",
              longform ? "mt-2 text-xl tracking-tight text-balance md:text-2xl" : "text-base",
            )}
          >
            {article.title}
          </p>
          <p className={cn("mt-1 text-pretty text-ink-muted", longform ? "mt-2 text-base" : "text-sm")}>
            {article.summary}
          </p>
          {longform && article.readingTime ? (
            <p className={cn(META, "mt-4")}>{article.readingTime} min read</p>
          ) : null}
        </div>
        <ArrowRight01Icon
          data-arrow=""
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-ink-subtle transition-[color,transform] duration-150 [transition-timing-function:var(--ease-out)]",
            longform ? "mt-8" : "mt-1",
          )}
        />
      </Link>
    </li>
  )
}

function CategorySection({ category, className }: { category: HelpCategoryWithArticles; className?: string }) {
  return (
    <div
      id={category.id}
      className={cn("grid scroll-mt-24 gap-6 border-t border-line pt-8 lg:grid-cols-[3fr_9fr] lg:gap-10", className)}
    >
      <div className="flex flex-col items-start gap-3">
        <IconBox category={category} />
        <h2 className="mt-1 text-xl font-medium tracking-tight text-ink">{category.title}</h2>
        <p className="max-w-xs text-sm text-pretty text-ink-muted">{category.description}</p>
        <p className={META}>{countLabel(category)}</p>
      </div>
      <ul className="grid gap-px self-start border border-line bg-line">
        {category.articles.map((article) => (
          <ArticleRow key={article.slug} article={article} longform={category.longform} />
        ))}
      </ul>
    </div>
  )
}

function AllCategories() {
  const task = CATEGORIES.filter((category) => !category.longform)
  const longform = CATEGORIES.filter((category) => category.longform)
  return (
    <>
      <Section size="lg">
        {/* COPY: needs Curtis's approval */}
        <div className="flex max-w-2xl flex-col gap-4">
          <h2 className="text-3xl font-medium tracking-tight text-balance md:text-4xl">All help articles</h2>
          <p className="text-lg text-pretty text-ink-muted">
            Articles marked Soon are being written. Ask us in the meantime and we&rsquo;ll walk you through it.
          </p>
        </div>
        <div className="mt-12 flex flex-col gap-12 md:mt-16 md:gap-16">
          {task.map((category) => (
            <CategorySection key={category.id} category={category} />
          ))}
        </div>
      </Section>
      {longform.length > 0 ? (
        // Long-form reading, set apart on the canvas tone.
        <Section size="lg" tone="canvas">
          <div className="flex flex-col gap-12 md:gap-16">
            {longform.map((category) => (
              <CategorySection key={category.id} category={category} className="first:border-t-0 first:pt-0" />
            ))}
          </div>
        </Section>
      ) : null}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* What's new + contact                                                       */
/* -------------------------------------------------------------------------- */

function WhatsNew() {
  if (LATEST_UPDATES.length === 0) return null
  return (
    <Section size="md">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col items-start gap-4">
          <Eyebrow icon={UPDATES.icon}>Updates</Eyebrow>
          <h2 className="text-3xl font-medium tracking-tight text-balance md:text-4xl">What&rsquo;s new</h2>
        </div>
        <LearnMore to={UPDATES.href}>View all updates</LearnMore>
      </div>
      <EntryList entries={LATEST_UPDATES} basePath={UPDATES.href} variant="changelog" headingLevel="h3" className="mt-8" />
    </Section>
  )
}

function ContactBand() {
  return (
    <Section size="sm" tone="canvas">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-12">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center border border-line bg-panel">
            <Mail01Icon className="size-5 text-brand-line" />
          </span>
          {/* COPY: needs Curtis's approval */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-medium tracking-tight text-balance">
              Can&rsquo;t find what you&rsquo;re looking for?
            </h2>
            <p className="max-w-xl text-base text-pretty text-ink-muted">
              Email us with your question. A person reads every message and will reply.
            </p>
          </div>
        </div>
        <LearnMore to={`mailto:${CONTACT_EMAIL}`} className="shrink-0 pl-14 md:pl-0">
          {CONTACT_EMAIL}
        </LearnMore>
      </div>
    </Section>
  )
}

export default function GuidesIndex() {
  return (
    <>
      <Hero />
      <CategoryCards />
      <PopularArticles />
      <AllCategories />
      <WhatsNew />
      <ContactBand />
      <ClosingCta />
    </>
  )
}
