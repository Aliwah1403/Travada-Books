import type { ReactNode } from "react"

import { cn } from "@travada-books/ui/lib/utils"
import type { Icon } from "@travada-books/ui/icons"

type FeatureItemProps = {
  icon: Icon
  title: ReactNode
  children: ReactNode
  className?: string
}

// Icon + title + short text (Laravel Cloud rows). Used in 3–5 column grids.
export function FeatureItem({ icon: IconComponent, title, children, className }: FeatureItemProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <IconComponent className="size-5 text-ink" aria-hidden="true" />
      <h3 className="mt-4 font-sans text-base font-medium text-ink">{title}</h3>
      <p className="mt-1.5 text-sm text-pretty text-ink-muted">{children}</p>
    </div>
  )
}
