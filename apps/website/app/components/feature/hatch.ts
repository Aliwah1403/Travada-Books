import type { CSSProperties } from "react"

// The faint four-direction hatch that sits behind feature-page hero
// visuals (tilted screenshot, split-bleed screenshot, floating fragments).
// Four 1px line sets at 22.5° steps, each a touch lighter than the last,
// drawn from the ink token so it follows the palette. Apply as an inline
// style on an absolutely positioned, aria-hidden layer and mask its edges.

const HATCH_LINE = (angle: number, pct: number) =>
  `repeating-linear-gradient(${angle}deg, transparent, transparent 1px, color-mix(in oklab, var(--color-ink) ${pct}%, transparent) 1px, color-mix(in oklab, var(--color-ink) ${pct}%, transparent) 2px, transparent 2px, transparent 4px)`

export const HATCH: CSSProperties = {
  backgroundImage: [HATCH_LINE(22.5, 6), HATCH_LINE(67.5, 5), HATCH_LINE(112.5, 4), HATCH_LINE(157.5, 3)].join(", "),
}
