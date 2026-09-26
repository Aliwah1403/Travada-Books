import type { ReactNode } from "react"

import { cn } from "@travada-books/ui/lib/utils"

type SplitProps = {
  start: ReactNode
  end: ReactNode
  /** Put `end` on the left from md up (mobile order is unchanged). */
  reverse?: boolean
  /** Vertically centre the two columns. */
  center?: boolean
  className?: string
  startClassName?: string
  endClassName?: string
}

const COLUMN = "px-4 py-12 sm:px-6 md:py-20 lg:px-10"

// Two columns divided by an internal vertical hairline (Medusa rows).
// Stacks on mobile with a horizontal hairline between. Brings its own
// padding, so place it in a `<Section flush>` for the hairline to reach
// the section's top and bottom edges.
export function Split({
  start,
  end,
  reverse = false,
  center = false,
  className,
  startClassName,
  endClassName,
}: SplitProps) {
  return (
    <div className={cn("grid md:grid-cols-2", center && "md:items-center", className)}>
      <div
        className={cn(
          COLUMN,
          "border-b border-line md:border-b-0",
          reverse ? "md:order-2 md:border-l" : "md:border-r",
          center && "md:self-stretch md:flex md:flex-col md:justify-center",
          startClassName,
        )}
      >
        {start}
      </div>
      <div
        className={cn(
          COLUMN,
          reverse && "md:order-1",
          center && "md:self-stretch md:flex md:flex-col md:justify-center",
          endClassName,
        )}
      >
        {end}
      </div>
    </div>
  )
}
