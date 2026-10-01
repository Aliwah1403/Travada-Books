import type { ReactNode } from "react"

import { cn } from "@travada-books/ui/lib/utils"
import type { Icon } from "@travada-books/ui/icons"

type EyebrowProps = {
  icon?: Icon
  children: ReactNode
  /** `pill` — a bordered badge (Pathly). Default — icon + label (Medusa). */
  variant?: "plain" | "pill"
  className?: string
}

export function Eyebrow({ icon: IconComponent, children, variant = "plain", className }: EyebrowProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-xs tracking-wide text-ink-muted uppercase",
        variant === "pill" && "rounded-full border border-line bg-panel py-1 pr-3 pl-2 normal-case tracking-normal",
        className,
      )}
    >
      {IconComponent ? (
        <IconComponent className="size-4 shrink-0 text-brand-line" aria-hidden="true" />
      ) : null}
      {children}
    </span>
  )
}
