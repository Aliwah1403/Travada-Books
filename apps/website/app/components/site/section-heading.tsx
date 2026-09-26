import type { ReactNode } from "react"

import { cn } from "@travada-books/ui/lib/utils"

type SectionHeadingProps = {
  /** Usually an `<Eyebrow>`. */
  eyebrow?: ReactNode
  title: ReactNode
  lede?: ReactNode
  align?: "left" | "center"
  /** Heading level — h2 by default; h1 for page heroes. */
  as?: "h1" | "h2"
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  as: Heading = "h2",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex max-w-2xl flex-col gap-4",
        align === "center" && "mx-auto items-center text-center",
        className,
      )}
    >
      {eyebrow}
      <Heading
        className={cn(
          "font-sans font-medium tracking-tight text-balance",
          Heading === "h1" ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl",
        )}
      >
        {title}
      </Heading>
      {lede ? <p className="text-lg text-pretty text-ink-muted">{lede}</p> : null}
    </div>
  )
}
