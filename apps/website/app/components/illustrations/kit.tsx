import type { ReactNode, SVGProps } from "react"

import { cn } from "@travada-books/ui/lib/utils"

import { revealStep } from "~/components/feature/mockups/reveal"
import { STROKE, cornerInset, isoMatrix, liftOffset, stackPoint } from "~/components/illustrations/iso"

// Illustration kit (WEBSITE-REDO-PLAN.md §3): isometric line art in the
// Medusa style — thin grey outlines, white/light-grey fills, one pale
// brand layer per illustration, mono callouts with thin leader lines.
//
// Coordinate model: `Iso` projects its children from a flat top plane.
// Everything *inside* an `Iso` (slabs, UI lines) is drawn flat, in plain
// x/y units; `Callout` and `Connector` are drawn *outside* in screen
// units — use `isoPoint()` from ./iso to find where a flat point lands.
// Strokes are non-scaling, so they stay ~1px through the projection and
// through viewBox scaling.


// Tone classes. `base` is the default grey/white line art; `brand` is the
// single highlighted layer.
// `inverse` / `inverseBrand` are the same two roles for dark surfaces
// (Section tone="dark"): light hairlines on opaque dark fills — fills stay
// opaque so layers still occlude what is behind them.
const INVERSE_TOP = "fill-[color-mix(in_oklab,var(--color-dark),var(--color-panel)_7%)]"
const INVERSE_SIDE = "fill-[color-mix(in_oklab,var(--color-dark),var(--color-panel)_3%)]"
const INVERSE_BRAND = "fill-[color-mix(in_oklab,var(--color-dark),var(--color-brand-line)_28%)]"

const TONE = {
  base: { top: "fill-panel stroke-line-strong", side: "fill-canvas stroke-line-strong", sideFill: "fill-canvas" },
  brand: { top: "fill-brand-soft stroke-brand-line", side: "fill-brand-soft stroke-brand-line", sideFill: "fill-brand-soft" },
  inverse: {
    top: `${INVERSE_TOP} stroke-panel/35`,
    side: `${INVERSE_SIDE} stroke-panel/35`,
    sideFill: INVERSE_SIDE,
  },
  inverseBrand: {
    top: `${INVERSE_BRAND} stroke-brand-soft/70`,
    side: `${INVERSE_BRAND} stroke-brand-soft/70`,
    sideFill: INVERSE_BRAND,
  },
}

export type Tone = keyof typeof TONE

// Per-tone classes for the smaller marks (leader lines, dots, UI bars…).
const MARK: Record<
  Tone,
  { stroke: string; dot: string; text: string; bar: string; pill: string; button: string; avatar: string }
> = {
  base: {
    stroke: "stroke-line-strong",
    dot: "fill-ink-subtle",
    text: "fill-ink-muted",
    bar: "fill-line",
    pill: "fill-canvas stroke-line-strong",
    button: "fill-panel stroke-line-strong",
    avatar: "fill-canvas stroke-line-strong",
  },
  brand: {
    stroke: "stroke-brand-line",
    dot: "fill-brand-line",
    text: "fill-brand",
    bar: "fill-brand-line/40",
    pill: "fill-brand-soft stroke-brand-line",
    button: "fill-brand-line stroke-brand-line",
    avatar: "fill-brand-soft stroke-brand-line",
  },
  inverse: {
    stroke: "stroke-panel/35",
    dot: "fill-panel/60",
    text: "fill-panel/70",
    bar: "fill-panel/20",
    pill: `${INVERSE_SIDE} stroke-panel/35`,
    button: `${INVERSE_TOP} stroke-panel/35`,
    avatar: `${INVERSE_SIDE} stroke-panel/40`,
  },
  inverseBrand: {
    stroke: "stroke-brand-soft/70",
    dot: "fill-brand-soft",
    text: "fill-brand-soft",
    bar: "fill-brand-soft/35",
    pill: `${INVERSE_BRAND} stroke-brand-soft/70`,
    button: "fill-brand-soft/80 stroke-brand-soft",
    avatar: `${INVERSE_BRAND} stroke-brand-soft/70`,
  },
}

/* -------------------------------------------------------------------------- */
/* Iso                                                                         */
/* -------------------------------------------------------------------------- */

type IsoProps = SVGProps<SVGGElement> & {
  /** Screen position of the flat origin (0, 0). */
  x?: number
  y?: number
}

/** Projects its children from the flat top plane to isometric. */
export function Iso({ x = 0, y = 0, children, ...props }: IsoProps) {
  return (
    <g transform={isoMatrix(x, y)} {...props}>
      {children}
    </g>
  )
}

/** One step of a frame's staggered build (revealStep → app.css). The step
 *  sits on an untransformed <g> outside the Iso matrix so its entrance
 *  lifts straight up on screen, not along the flat plane. */
export function IsoStep({ step, x = 0, y = 0, children }: { step: number; x?: number; y?: number; children: ReactNode }) {
  return (
    <g {...revealStep(step)}>
      <Iso x={x} y={y}>
        {children}
      </Iso>
    </g>
  )
}

/* -------------------------------------------------------------------------- */
/* IsoSlab                                                                     */
/* -------------------------------------------------------------------------- */

type IsoSlabProps = {
  /** Flat position of the slab's back corner. */
  x?: number
  y?: number
  /** Flat width (along the down-right axis) and depth (down-left axis). */
  w: number
  h: number
  /** Thickness in screen units. */
  t?: number
  /** Corner radius in flat units. */
  r?: number
  tone?: Tone
  /** Drawn on the top face, in flat coordinates relative to the slab. */
  children?: ReactNode
  className?: string
}

/**
 * A rounded plate with visible thickness. Must be rendered inside `Iso`.
 *
 * Thickness t (screen-down) is a flat (t, t) shift, so the slab is:
 *   1. the top shape shifted by (t, t) — the bottom face; only its front
 *      (lower) outline ends up visible,
 *   2. the band between the two silhouette tangent points D* and B* and
 *      their shifted copies — the side faces, with the two vertical edges,
 *   3. the top face.
 * D* / B* are where the rounded outline's normal is perpendicular to the
 * (1, 1) extrusion direction — the leftmost / rightmost points on screen —
 * so the vertical edges meet the top face exactly on its silhouette.
 */
export function IsoSlab({
  x = 0,
  y = 0,
  w,
  h,
  t = 10,
  r = 8,
  tone = "base",
  children,
  className,
}: IsoSlabProps) {
  const rr = Math.min(r, w / 2, h / 2)
  const k = rr * (1 - Math.SQRT1_2) // corner-centre offset to the 45° point
  // Silhouette tangent points (flat, slab-relative).
  const dStar: [number, number] = [k, h - k] // left extreme, on the (0, h) corner
  const bStar: [number, number] = [w - k, k] // right extreme, on the (w, 0) corner
  const cls = TONE[tone]

  return (
    <g transform={`translate(${x} ${y})`} className={className}>
      {/* 1. bottom face */}
      <rect x={t} y={t} width={w} height={h} rx={rr} className={cls.side} {...STROKE} />
      {/* 2. side band (fill only) + vertical edges */}
      <polygon
        points={`${dStar[0]},${dStar[1]} ${dStar[0] + t},${dStar[1] + t} ${bStar[0] + t},${bStar[1] + t} ${bStar[0]},${bStar[1]}`}
        // Fill only — a stroke class here would draw the hidden chords.
        className={cls.sideFill}
      />
      <line x1={dStar[0]} y1={dStar[1]} x2={dStar[0] + t} y2={dStar[1] + t} className={cls.side} {...STROKE} />
      <line x1={bStar[0]} y1={bStar[1]} x2={bStar[0] + t} y2={bStar[1] + t} className={cls.side} {...STROKE} />
      {/* 3. top face */}
      <rect width={w} height={h} rx={rr} className={cls.top} {...STROKE} />
      {children}
    </g>
  )
}

/* -------------------------------------------------------------------------- */
/* IsoStack                                                                    */
/* -------------------------------------------------------------------------- */

export type IsoStackLayer = {
  tone?: Tone
  /** Drawn on this layer's top face (flat, layer-relative). */
  content?: ReactNode
}

type IsoStackProps = {
  /** Bottom layer first. */
  layers: IsoStackLayer[]
  w: number
  h: number
  t?: number
  r?: number
  /** Screen distance between layers (exploded view). */
  gap?: number
  /** Flat position of the bottom layer. */
  x?: number
  y?: number
}

/** N slabs lifted straight up the screen — an exploded layer stack. Render inside `Iso`. */
export function IsoStack({ layers, w, h, t = 10, r = 8, gap = 48, x = 0, y = 0 }: IsoStackProps) {
  return (
    <g>
      {layers.map((layer, i) => {
        const [dx, dy] = liftOffset(i * gap)
        return (
          <IsoSlab key={i} x={x + dx} y={y + dy} w={w} h={h} t={t} r={r} tone={layer.tone}>
            {layer.content}
          </IsoSlab>
        )
      })}
    </g>
  )
}

/* -------------------------------------------------------------------------- */
/* StackGuides                                                                 */
/* -------------------------------------------------------------------------- */

type StackGuidesProps = {
  /** Screen position of the bottom layer's flat origin (same as the `Iso` x/y). */
  tx: number
  ty: number
  w: number
  h: number
  r?: number
  t?: number
  gap: number
  layers: number
  tone?: Tone
}

/**
 * Dashed verticals through a stack's left, front and right silhouette
 * points (Medusa's exploded views). Screen coords — render *before* the
 * `Iso` stack so the opaque slabs hide them and they show only in the gaps.
 */
export function StackGuides({ tx, ty, w, h, r = 8, t = 10, gap, layers, tone = "base" }: StackGuidesProps) {
  const k = cornerInset(Math.min(r, w / 2, h / 2))
  const top = layers - 1
  const points: [number, number][] = [
    [k, h - k], // left extreme
    [w - k, h - k], // front corner
    [w - k, k], // right extreme
  ]
  return (
    <g className={MARK[tone].stroke} fill="none">
      {points.map(([x, y]) => {
        const [x1, y1] = stackPoint(top, gap, x, y, tx, ty)
        const [, y2] = stackPoint(0, gap, x, y, tx, ty)
        return <line key={`${x}-${y}`} x1={x1} y1={y1} x2={x1} y2={y2 + t} strokeDasharray="3 4" {...STROKE} />
      })}
    </g>
  )
}

/* -------------------------------------------------------------------------- */
/* Callout                                                                     */
/* -------------------------------------------------------------------------- */

type CalloutProps = {
  /** Screen point the leader line starts from (gets the end dot). */
  x: number
  y: number
  label: string
  /** Offset from the anchor to the elbow. */
  dx?: number
  dy?: number
  /** Length of the horizontal run after the elbow. */
  run?: number
  /** Font size in user units — keep ≥ 12 at the illustration's display size. */
  fontSize?: number
  tone?: Tone
}

/** Mono uppercase label with an elbowed leader line and an end dot. Screen coords. */
export function Callout({
  x,
  y,
  label,
  dx = 32,
  dy = -24,
  run = 16,
  fontSize = 12,
  tone = "base",
}: CalloutProps) {
  const toRight = dx >= 0
  const ex = x + dx
  const ey = y + dy
  const lx = ex + (toRight ? run : -run)
  const { stroke, dot } = MARK[tone]

  return (
    <g>
      <polyline points={`${x},${y} ${ex},${ey} ${lx},${ey}`} fill="none" className={stroke} {...STROKE} />
      <circle cx={x} cy={y} r={2.5} className={dot} />
      <text
        x={lx + (toRight ? 6 : -6)}
        y={ey}
        dominantBaseline="middle"
        textAnchor={toRight ? "start" : "end"}
        fontSize={fontSize}
        letterSpacing="0.06em"
        className={cn("font-mono uppercase", MARK[tone].text)}
      >
        {label}
      </text>
    </g>
  )
}

/* -------------------------------------------------------------------------- */
/* Connector                                                                   */
/* -------------------------------------------------------------------------- */

type ConnectorProps = {
  from: [number, number]
  to: [number, number]
  /** Which axis the curve leaves and enters along. */
  axis?: "horizontal" | "vertical"
  dashed?: boolean
  /** Dot on the `to` end. */
  endDot?: boolean
  tone?: Tone
}

/** Smooth cubic curve between two screen points. Static — no animation. */
export function Connector({
  from,
  to,
  axis = "horizontal",
  dashed = false,
  endDot = true,
  tone = "base",
}: ConnectorProps) {
  const [x1, y1] = from
  const [x2, y2] = to
  const d =
    axis === "horizontal"
      ? `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`
      : `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`
  const { stroke } = MARK[tone]

  return (
    <g>
      <path d={d} fill="none" className={stroke} strokeDasharray={dashed ? "4 4" : undefined} {...STROKE} />
      {endDot ? <circle cx={x2} cy={y2} r={2.5} className={MARK[tone].dot} /> : null}
    </g>
  )
}

/* -------------------------------------------------------------------------- */
/* UI placeholders — drawn flat, inside a slab                                 */
/* -------------------------------------------------------------------------- */

type UiLinesProps = {
  x: number
  y: number
  /** One bar per entry, in flat units. */
  widths: number[]
  /** Bar thickness and vertical pitch. */
  size?: number
  pitch?: number
  tone?: Tone
}

/** Placeholder "text lines". */
export function UiLines({ x, y, widths, size = 4, pitch = 10, tone = "base" }: UiLinesProps) {
  return (
    <g className={MARK[tone].bar}>
      {widths.map((width, i) => (
        <rect key={i} x={x} y={y + i * pitch} width={width} height={size} rx={size / 2} />
      ))}
    </g>
  )
}

type BoxProps = { x: number; y: number; w: number; h: number; tone?: Tone }

/** Rounded status pill. */
export function UiPill({ x, y, w, h, tone = "base" }: BoxProps) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={h / 2}
      className={MARK[tone].pill}
      {...STROKE}
    />
  )
}

/** Button shape — solid in the brand tone, outlined otherwise. */
export function UiButton({ x, y, w, h, tone = "base" }: BoxProps) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={Math.min(4, h / 2)}
      className={MARK[tone].button}
      {...STROKE}
    />
  )
}

/** Avatar circle. */
export function UiAvatar({ cx, cy, r = 6, tone = "base" }: { cx: number; cy: number; r?: number; tone?: Tone }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      className={MARK[tone].avatar}
      {...STROKE}
    />
  )
}
