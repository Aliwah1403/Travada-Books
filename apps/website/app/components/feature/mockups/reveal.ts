import type { CSSProperties } from "react"

/** Props that make an element one step of a MockFrame's staggered entrance
 *  (CSS in app.css). Harmless when the frame never arms the reveal. */
export function revealStep(index: number): { "data-reveal-item": ""; style: CSSProperties } {
  return { "data-reveal-item": "", style: { "--reveal-i": index } as CSSProperties }
}
