import type { ReactNode } from "react"

import { cn } from "@travada-books/ui/lib/utils"

// Responsive shell shared by the feature illustrations (I3–I5, I9–I11).
//
// Same technique as I1 (books-stack.tsx): one geometry, two renders.
// - From `labelsFrom` up: the full SVG with its mono callouts. Callout
//   font sizes are chosen so text renders at ≥ 12px at the narrowest width
//   the illustration is shown at from that breakpoint.
// - Below it: the art alone (no in-SVG text, optionally a tighter viewBox),
//   followed by an HTML legend in `text-xs`, so no label ever renders
//   below 12px on a phone.
//
// Where each illustration is used:
// - feature page hero (`labelsFrom="sm"`): stacked sm–lg at ≥ 544px, then
//   the 7fr hero column at ≥ 505px (lg, 1024px).
// - home feature rows (`labelsFrom="xl"`): the half-width Split column is
//   ≥ 536px from xl (1280px); narrower than that, the legend is used.

export type LabelsFrom = "sm" | "xl"

const SHOW: Record<LabelsFrom, string> = {
  sm: "hidden sm:block",
  xl: "hidden xl:block",
}

const HIDE: Record<LabelsFrom, string> = {
  sm: "sm:hidden",
  xl: "xl:hidden",
}

export type LegendItem = { label: string; brand?: boolean }

type StemLabelProps = {
  /** Anchor point (gets the dot). Screen coords. */
  x: number
  y: number
  label: string
  /** Stem length; negative draws the label above the anchor. */
  length: number
  fontSize: number
  brand?: boolean
}

/**
 * A callout variant for labels centred over or under a column: a straight
 * vertical stem from the anchor dot, text centred at its end. Same marks
 * as the kit's `Callout` (base / brand tones).
 */
export function StemLabel({ x, y, label, length, fontSize, brand = false }: StemLabelProps) {
  const end = y + length
  const textY = length < 0 ? end - fontSize * 0.75 : end + fontSize * 0.75
  return (
    <g>
      <line
        x1={x}
        y1={y}
        x2={x}
        y2={end}
        className={brand ? "stroke-brand-line" : "stroke-line-strong"}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={x} cy={y} r={2.5} className={brand ? "fill-brand-line" : "fill-ink-subtle"} />
      <text
        x={x}
        y={textY}
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={fontSize}
        letterSpacing="0.06em"
        className={cn("font-mono uppercase", brand ? "fill-brand" : "fill-ink-muted")}
      >
        {label}
      </text>
    </g>
  )
}

type IllustrationFrameProps = {
  label: string
  viewBox: string
  /** Tighter crop for the label-free render; defaults to `viewBox`. */
  compactViewBox?: string
  /** The line art, drawn in both renders. */
  art: ReactNode
  /** Callouts, drawn only in the full render. */
  callouts: ReactNode
  legend: LegendItem[]
  labelsFrom?: LabelsFrom
  className?: string
}

export function IllustrationFrame({
  label,
  viewBox,
  compactViewBox,
  art,
  callouts,
  legend,
  labelsFrom = "sm",
  className,
}: IllustrationFrameProps) {
  return (
    <div className={className}>
      <svg viewBox={viewBox} role="img" aria-label={label} className={cn("h-auto w-full", SHOW[labelsFrom])}>
        {art}
        {callouts}
      </svg>

      <div className={HIDE[labelsFrom]}>
        <svg
          viewBox={compactViewBox ?? viewBox}
          role="img"
          aria-label={label}
          className="mx-auto h-auto w-full max-w-sm"
        >
          {art}
        </svg>
        <ul
          aria-hidden="true"
          className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 font-mono text-xs tracking-wide text-ink-muted uppercase"
        >
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", item.brand ? "bg-brand-line" : "bg-ink-subtle")} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
