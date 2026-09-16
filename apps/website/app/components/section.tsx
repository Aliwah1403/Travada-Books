import type { ComponentProps } from "react"

import { cn } from "@travada-books/ui/lib/utils"

import { Container } from "~/components/container"

type SectionProps = ComponentProps<"section"> & {
  /** Quieter, visually separated band — used for the "Coming soon" section. */
  muted?: boolean
  containerClassName?: string
}

export function Section({
  className,
  containerClassName,
  muted,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn("py-24 md:py-32", muted && "bg-muted/40", className)} {...props}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  )
}
