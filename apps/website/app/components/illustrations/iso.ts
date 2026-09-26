// Isometric maths shared by the illustration kit.
//
// The top plane is projected with matrix(a b c d e f) =
// matrix(0.866 0.5 -0.866 0.5 tx ty), i.e. a flat point (x, y) lands at
//   X = 0.866·x − 0.866·y + tx
//   Y = 0.5·x   + 0.5·y   + ty
// so the flat x axis runs down-right at 30° and the flat y axis down-left.
//
// Useful consequence: moving a point straight DOWN the screen by t equals
// moving it by (t, t) in flat space (0.866·(t − t) = 0, 0.5·(t + t) = t).
// That is how slab thickness is drawn without leaving the flat plane.

export const COS30 = 0.866

/**
 * Presentation props for every kit line. Non-scaling, so strokes stay ~1px
 * through the iso projection and viewBox scaling. `vector-effect` is not
 * inherited — spread this on each shape, not on a wrapping <g>.
 */
export const STROKE = {
  strokeWidth: 1,
  vectorEffect: "non-scaling-stroke",
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const

export function isoMatrix(tx = 0, ty = 0) {
  return `matrix(${COS30} 0.5 ${-COS30} 0.5 ${tx} ${ty})`
}

/** Project a flat top-plane point to screen (SVG user) coordinates. */
export function isoPoint(x: number, y: number, tx = 0, ty = 0): [number, number] {
  return [COS30 * (x - y) + tx, 0.5 * (x + y) + ty]
}

/**
 * Flat-space offset for a layer lifted `lift` screen units straight up
 * (used by IsoStack and for placing callouts on stacked layers).
 */
export function liftOffset(lift: number): [number, number] {
  return [-lift, -lift]
}

/**
 * Screen point of a flat point (x, y) on layer `layer` of an exploded
 * stack whose bottom layer's flat origin lands at (tx, ty) and whose
 * layers sit `gap` screen units apart.
 */
export function stackPoint(
  layer: number,
  gap: number,
  x: number,
  y: number,
  tx: number,
  ty: number,
): [number, number] {
  const [dx, dy] = liftOffset(layer * gap)
  return isoPoint(x + dx, y + dy, tx, ty)
}

/**
 * Flat inset from a rounded corner's square point to its 45° point — where
 * a slab's silhouette (and so a callout dot) actually sits.
 */
export function cornerInset(r: number) {
  return r * (1 - Math.SQRT1_2)
}
