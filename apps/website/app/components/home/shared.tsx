import type { ReactNode } from "react"
import { Link } from "react-router"

import { ArrowRight01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

// Inline brand link with a chevron (Medusa "Learn more ›").
export function LearnMore({
  to,
  children = "Learn more",
  className,
}: {
  to: string
  children?: ReactNode
  className?: string
}) {
  const classes = cn(
    "inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors active:opacity-80 fine-hover:text-brand-line",
    "[&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:[transition-timing-function:var(--ease-out)] fine-hover:[&_svg]:translate-x-0.5",
    className,
  )
  const content = (
    <>
      {children}
      <ArrowRight01Icon className="size-4" aria-hidden="true" />
    </>
  )
  if (to.startsWith("mailto:") || to.startsWith("#")) {
    return (
      <a href={to} className={classes}>
        {content}
      </a>
    )
  }
  return (
    <Link to={to} className={classes}>
      {content}
    </Link>
  )
}
