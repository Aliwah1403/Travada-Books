import type { ComponentProps } from "react"

import { cn } from "@travada-books/ui/lib/utils"

import { FRAME_GUTTER, FRAME_WIDTH } from "~/components/site/layout"

type SectionProps = ComponentProps<"section"> & {
  /** Vertical padding scale. Ignored when `flush`. */
  size?: "sm" | "md" | "lg"
  tone?: "panel" | "canvas" | "dark"
  /** No inner padding at all — for `Split` and other edge-to-edge layouts
   *  that bring their own padding so internal hairlines reach the edges. */
  flush?: boolean
  /** Draw `+` ticks where this section's bottom hairline meets the rails. */
  ticks?: boolean
  innerClassName?: string
}

const SIZE = {
  sm: "py-12 md:py-16",
  md: "py-16 md:py-24",
  lg: "py-24 md:py-32",
}

const TONE = {
  panel: "bg-panel text-ink",
  canvas: "bg-canvas text-ink",
  dark: "bg-dark text-panel",
}

// A `+` drawn with two 1px bars, centred on a frame corner.
function Tick({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -bottom-px z-10 hidden size-2.5 translate-y-1/2 sm:block",
        side === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
        "before:absolute before:inset-x-0 before:top-1/2 before:h-px before:-translate-y-1/2 before:bg-line-strong",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-line-strong",
      )}
    />
  )
}

// A full-bleed band with a hairline under it. Content is constrained to
// the frame; the background and border run edge to edge.
export function Section({
  size = "md",
  tone = "panel",
  flush = false,
  ticks = true,
  className,
  innerClassName,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        "border-b",
        tone === "dark" ? "border-dark" : "border-line",
        TONE[tone],
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "relative",
          FRAME_WIDTH,
          !flush && FRAME_GUTTER,
          !flush && SIZE[size],
          innerClassName,
        )}
      >
        {children}
        {ticks ? (
          <>
            <Tick side="left" />
            <Tick side="right" />
          </>
        ) : null}
      </div>
    </section>
  )
}
