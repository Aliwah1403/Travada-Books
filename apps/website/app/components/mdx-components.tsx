/* eslint-disable react-refresh/only-export-components -- this file exports
   a components map (mdxComponents) plus the prose wrapper classes, not a
   route/page component. */
import type { ComponentProps } from "react"
import { Link } from "react-router"

import { cn } from "@travada-books/ui/lib/utils"

import { CompareSplit } from "~/components/compare-split"

// Classes for the element that wraps a rendered MDX body. They cover what
// the components map can't reach: raw JSX `<a>` tags written inside MDX
// (the legal pages' mailto links) bypass the `a` mapping, so they get the
// same link treatment here.
export const MDX_BODY_CLASS = cn(
  "min-w-0",
  "[&_a:not([data-mdx-link])]:text-brand [&_a:not([data-mdx-link])]:underline [&_a:not([data-mdx-link])]:decoration-brand/30 [&_a:not([data-mdx-link])]:underline-offset-4",
)

// Long-form articles open with a lead paragraph: larger and in full ink.
// Only direct children, so a paragraph inside a blockquote never matches.
export const MDX_LEAD_CLASS =
  "[&>p:first-child]:mt-0 [&>p:first-child]:text-lg [&>p:first-child]:text-ink md:[&>p:first-child]:text-xl md:[&>p:first-child]:leading-relaxed"

const BODY_TEXT = "text-base/7 text-ink-muted md:text-lg/8"

function isExternal(href: string) {
  return /^https?:\/\//.test(href) || href.startsWith("mailto:")
}

function A({ href = "", className, ...props }: ComponentProps<"a">) {
  const linkClassName = cn(
    "text-brand underline decoration-brand/30 underline-offset-4 transition-colors active:opacity-80 fine-hover:text-brand-line fine-hover:decoration-brand-line",
    className,
  )
  if (isExternal(href)) {
    return <a data-mdx-link="" href={href} className={linkClassName} {...props} />
  }
  return <Link data-mdx-link="" to={href} className={linkClassName} {...props} />
}

export const mdxComponents = {
  h1: ({ className, ...props }: ComponentProps<"h1">) => (
    <h1
      className={cn("mt-12 text-3xl font-medium tracking-tight text-balance text-ink first:mt-0", className)}
      {...props}
    />
  ),
  h2: ({ className, ...props }: ComponentProps<"h2">) => (
    <h2
      className={cn(
        "mt-14 scroll-mt-24 text-2xl font-medium tracking-tight text-balance text-ink first:mt-0 md:text-3xl",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: ComponentProps<"h3">) => (
    <h3
      className={cn("mt-10 scroll-mt-24 text-lg font-medium text-balance text-ink md:text-xl", className)}
      {...props}
    />
  ),
  p: ({ className, ...props }: ComponentProps<"p">) => (
    <p className={cn("mt-5 text-pretty", BODY_TEXT, className)} {...props} />
  ),
  strong: ({ className, ...props }: ComponentProps<"strong">) => (
    <strong className={cn("font-medium text-ink", className)} {...props} />
  ),
  a: A,
  ul: ({ className, ...props }: ComponentProps<"ul">) => (
    <ul
      className={cn("mt-5 list-disc space-y-2 pl-6 marker:text-ink-subtle", BODY_TEXT, className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }: ComponentProps<"ol">) => (
    <ol
      className={cn(
        "mt-5 list-decimal space-y-2 pl-6 marker:font-mono marker:text-sm marker:text-ink-subtle",
        BODY_TEXT,
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }: ComponentProps<"li">) => <li className={cn("pl-1", className)} {...props} />,
  blockquote: ({ className, ...props }: ComponentProps<"blockquote">) => (
    <blockquote
      className={cn(
        "mt-8 border border-l-2 border-line border-l-brand-line bg-canvas px-5 py-4",
        "[&>p]:mt-0 [&>p]:text-base/7 [&>p]:text-ink [&>p+p]:mt-3",
        className,
      )}
      {...props}
    />
  ),
  // Tables scroll inside their own hairline frame on narrow screens, so the
  // page itself never scrolls sideways. The frame is focusable so keyboard
  // users can scroll it too.
  table: ({ className, ...props }: ComponentProps<"table">) => (
    <div
      role="region"
      aria-label="Table"
      tabIndex={0}
      className="mt-8 overflow-x-auto border border-line bg-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-line"
    >
      <table className={cn("w-full min-w-[36rem] border-collapse text-left text-sm", className)} {...props} />
    </div>
  ),
  tbody: ({ className, ...props }: ComponentProps<"tbody">) => (
    <tbody className={cn("[&>tr:last-child>td]:border-b-0", className)} {...props} />
  ),
  th: ({ className, ...props }: ComponentProps<"th">) => (
    <th
      className={cn(
        "border-r border-b border-line bg-canvas px-4 py-3 align-bottom font-medium text-ink last:border-r-0",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: ComponentProps<"td">) => (
    <td
      className={cn(
        "border-r border-b border-line px-4 py-3 align-top text-ink-muted last:border-r-0 first:font-medium first:text-ink",
        className,
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }: ComponentProps<"code">) => (
    <code
      className={cn(
        "border border-line bg-canvas px-1 py-0.5 font-mono text-sm text-ink wrap-anywhere",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }: ComponentProps<"hr">) => (
    <hr className={cn("my-12 border-line", className)} {...props} />
  ),
  img: ({ className, alt = "", ...props }: ComponentProps<"img">) => (
    <img alt={alt} loading="lazy" className={cn("mt-8 w-full border border-line bg-panel", className)} {...props} />
  ),
  // Not a standard element override — an opt-in custom component compare
  // articles render directly in MDX (`<CompareSplit oldItems={...}
  // newItems={...} />`). See compare-split.tsx.
  CompareSplit,
}
