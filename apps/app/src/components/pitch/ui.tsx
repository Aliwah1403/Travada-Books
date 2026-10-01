import type { ReactNode } from "react"

import { cn } from "@travada-books/ui/lib/utils"

export function Slide({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-screen w-full flex-col items-center justify-center px-6 py-24 text-center md:px-16 lg:px-24",
        className
      )}
    >
      {children}
    </div>
  )
}

// Fixed per-slide chrome: eyebrow label top-left, wordmark top-right.
export function SlideHeader({ eyebrow }: { eyebrow: string }) {
  return (
    <div className="absolute inset-x-6 top-6 z-10 flex items-center justify-between text-xs text-muted-foreground md:inset-x-16 md:top-8 lg:inset-x-24">
      <span className="font-heading font-medium tracking-widest uppercase">{eyebrow}</span>
      <span>Travada Books</span>
    </div>
  )
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center gap-4 rounded-lg border border-border bg-card/60 px-8 py-10 text-card-foreground",
        className
      )}
    >
      {children}
    </div>
  )
}

// Icon + title + description card, matching the reference deck's "One OS" / "Disorganization" style cards.
export function FeatureCard({
  icon,
  title,
  description,
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card/60 px-8 py-10 text-center text-card-foreground",
        className
      )}
    >
      <div className="text-foreground [&_svg]:size-8 md:[&_svg]:size-9">{icon}</div>
      <span className="font-heading text-base font-medium text-foreground md:text-lg">{title}</span>
      <p className="text-sm text-muted-foreground md:text-base">{description}</p>
    </div>
  )
}

// Labeled placeholder marking where a real screenshot / illustration goes.
// Intentionally unstyled beyond a dashed border — final framing/cropping happens later.
export function ImagePlaceholder({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-64 items-center justify-center rounded-lg border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground",
        className
      )}
    >
      {label}
    </div>
  )
}

export function Grid() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 flex justify-center overflow-hidden">
      <div className="grid h-full w-full max-w-7xl grid-cols-4 gap-x-12 px-6 md:grid-cols-6 md:px-16">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="hidden border-r border-border/60 md:block" />
        ))}
      </div>
    </div>
  )
}
