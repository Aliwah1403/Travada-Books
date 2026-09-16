import type { ComponentType, ReactNode } from "react"

import { cn } from "@travada-books/ui/lib/utils"

type FeatureCardProps = {
  icon?: ComponentType<{ className?: string }>
  title: string
  children: ReactNode
  className?: string
}

export function FeatureCard({ icon: Icon, title, children, className }: FeatureCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-background p-6",
        className,
      )}
    >
      {Icon && <Icon className="size-5 text-muted-foreground" />}
      <h3 className="font-heading text-base font-medium text-foreground">{title}</h3>
      <p className="max-w-[65ch] font-heading text-sm/relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  )
}
