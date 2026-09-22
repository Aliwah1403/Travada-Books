/* eslint-disable react-refresh/only-export-components -- this file exports
   a components map (mdxComponents) plus its helper renderers, not a
   route/page component. */
import type { ComponentProps } from "react"
import { Link } from "react-router"

import { cn } from "@travada-books/ui/lib/utils"

function isExternal(href: string) {
  return /^https?:\/\//.test(href) || href.startsWith("mailto:")
}

function A({ href = "", className, ...props }: ComponentProps<"a">) {
  const linkClassName = cn(
    "text-primary underline underline-offset-4 transition-colors fine-hover:text-primary/80",
    className,
  )
  if (isExternal(href)) {
    return <a href={href} className={linkClassName} {...props} />
  }
  return <Link to={href} className={linkClassName} {...props} />
}

export const mdxComponents = {
  h1: ({ className, ...props }: ComponentProps<"h1">) => (
    <h1
      className={cn(
        "mt-10 text-3xl font-medium tracking-tight text-foreground first:mt-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: ComponentProps<"h2">) => (
    <h2
      className={cn(
        "mt-14 text-3xl font-medium tracking-[-0.045em] text-foreground",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: ComponentProps<"h3">) => (
    <h3
      className={cn("mt-10 text-xl font-medium tracking-[-0.03em] text-foreground", className)}
      {...props}
    />
  ),
  p: ({ className, ...props }: ComponentProps<"p">) => (
    <p
      className={cn("mt-5 font-heading text-base/relaxed text-muted-foreground", className)}
      {...props}
    />
  ),
  a: A,
  ul: ({ className, ...props }: ComponentProps<"ul">) => (
    <ul
      className={cn(
        "mt-5 list-disc space-y-3 pl-5 font-heading text-base/relaxed text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }: ComponentProps<"ol">) => (
    <ol
      className={cn(
        "mt-5 list-decimal space-y-3 pl-5 font-heading text-base/relaxed text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }: ComponentProps<"li">) => (
    <li className={className} {...props} />
  ),
  table: ({ className, ...props }: ComponentProps<"table">) => (
    <div className="mt-7 overflow-x-auto border border-border">
      <table
        className={cn("w-full border-collapse font-heading text-sm/relaxed", className)}
        {...props}
      />
    </div>
  ),
  th: ({ className, ...props }: ComponentProps<"th">) => (
    <th
      className={cn(
        "border-b border-r border-border bg-muted/50 px-4 py-3 text-left font-medium text-foreground last:border-r-0",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: ComponentProps<"td">) => (
    <td
      className={cn(
        "border-r border-b border-border px-4 py-3 text-muted-foreground last:border-r-0",
        className,
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }: ComponentProps<"code">) => (
    <code
      className={cn(
        "rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground",
        className,
      )}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }: ComponentProps<"blockquote">) => (
    <blockquote
      className={cn(
        "mt-7 border-l-2 border-primary py-2 pl-5 font-heading text-base/relaxed text-foreground italic",
        className,
      )}
      {...props}
    />
  ),
}
