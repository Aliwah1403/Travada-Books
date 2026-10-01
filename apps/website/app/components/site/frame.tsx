import type { ReactNode } from "react"

import { cn } from "@travada-books/ui/lib/utils"

import { FRAME_WIDTH } from "~/components/site/layout"

// The page frame (Pathly): two full-height vertical hairlines on the edges
// of the centred 76rem column, running from the header to the footer.
// Content stays full-bleed so section hairlines can run edge to edge; the
// rails are a pointer-events-none overlay painted above section fills.
// Used once, in root.tsx.
export function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative flex min-h-dvh flex-col", className)}>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 left-0 z-50 hidden border-x border-line sm:block",
          FRAME_WIDTH,
        )}
      />
      {children}
    </div>
  )
}
