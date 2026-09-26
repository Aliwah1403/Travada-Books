import type { ReactNode } from "react"

import { STROKE, cornerInset, stackPoint } from "~/components/illustrations/iso"
import {
  Callout,
  Iso,
  IsoStack,
  StackGuides,
  UiAvatar,
  UiButton,
  UiLines,
  UiPill,
  type IsoStackLayer,
  type Tone,
} from "~/components/illustrations/kit"

// I2 — home "What is Travada Books" (WEBSITE-REDO-PLAN.md §3). Five
// product areas as one exploded stack: Vault at the base, then Inbox,
// Statement import, Invoicing and — highlighted on top — the Dashboard
// that everything rolls up into.
//
// Two layouts of the same layers:
// - wide (lg+): centred stack, callouts alternating left/right on long
//   horizontal leaders. viewBox 1000 wide, shown at ≥ 896px → 14-unit
//   text renders at ≥ 12.5px.
// - compact (< lg): stack on the left, every label on the right. viewBox
//   470 wide, capped at 448px and ≥ 343px on a 375px phone → 17-unit text
//   renders at ≥ 12.4px.
//
// Layer UI is drawn once in a 240 × 180 flat box and scaled down for the
// compact stack (strokes are non-scaling, so they stay hairline).

const BASE_W = 240
const BASE_H = 180

const LABEL =
  "An exploded stack of five layers: Vault at the base, then Inbox, Statement import, Invoicing, and the Dashboard highlighted on top"

type LayerDef = { label: string; tone?: Tone; content: ReactNode }

const LAYERS: LayerDef[] = [
  {
    label: "Vault",
    content: (
      <g>
        <UiLines x={18} y={18} widths={[60]} />
        {[0, 1, 2].map((col) =>
          [0, 1].map((row) => {
            const x = 18 + col * 72
            const y = 38 + row * 66
            return (
              <g key={`${col}-${row}`}>
                <path
                  d={`M${x},${y} H${x + 46} L${x + 56},${y + 10} V${y + 54} H${x} Z`}
                  className="fill-canvas stroke-line-strong"
                  {...STROKE}
                />
                <UiLines x={x + 8} y={y + 38} widths={[32]} size={3} />
              </g>
            )
          }),
        )}
      </g>
    ),
  },
  {
    label: "Inbox",
    content: (
      <g>
        <UiLines x={18} y={18} widths={[48]} />
        {[0, 1, 2, 3].map((row) => {
          const y = 40 + row * 34
          return (
            <g key={row}>
              <rect x={18} y={y} width={22} height={16} rx={3} className="fill-canvas stroke-line-strong" {...STROKE} />
              <path d={`M18,${y + 2} L29,${y + 9} L40,${y + 2}`} fill="none" className="stroke-line-strong" {...STROKE} />
              <UiLines x={50} y={y + 2} widths={[96 - row * 12, 60]} size={4} pitch={9} />
              {row === 1 ? <UiPill x={176} y={y + 1} w={44} h={14} /> : null}
            </g>
          )
        })}
      </g>
    ),
  },
  {
    label: "Statement import",
    content: (
      <g>
        <UiLines x={18} y={18} widths={[80]} />
        {[0, 1, 2, 3, 4, 5].map((row) => {
          const y = 40 + row * 22
          return (
            <g key={row}>
              <line x1={16} y1={y} x2={BASE_W - 16} y2={y} className="stroke-line" {...STROKE} />
              <UiLines x={20} y={y + 9} widths={[70 + ((row * 23) % 40)]} />
              <UiLines x={row % 2 ? 196 : 158} y={y + 9} widths={[26]} />
            </g>
          )
        })}
      </g>
    ),
  },
  {
    label: "Invoicing",
    content: (
      <g>
        <UiAvatar cx={28} cy={28} r={10} />
        <UiLines x={46} y={20} widths={[76, 46]} pitch={10} />
        <UiPill x={172} y={20} w={48} h={15} />
        <UiLines x={18} y={66} widths={[150, 120, 136]} pitch={16} />
        <UiLines x={190} y={66} widths={[30, 30, 30]} pitch={16} />
        <UiButton x={18} y={140} w={68} h={20} />
        <UiLines x={160} y={148} widths={[60]} />
      </g>
    ),
  },
  {
    label: "Dashboard",
    tone: "brand",
    content: (
      <g>
        {[0, 1, 2].map((card) => (
          <g key={card}>
            <rect
              x={16 + card * 72}
              y={16}
              width={64}
              height={40}
              rx={4}
              className="fill-brand-soft stroke-brand-line"
              {...STROKE}
            />
            <UiLines x={24 + card * 72} y={26} widths={[30, 44]} pitch={12} tone="brand" />
          </g>
        ))}
        <path
          d="M18,158 L52,132 L86,142 L120,110 L154,120 L188,86 L222,96"
          fill="none"
          className="stroke-brand-line"
          {...STROKE}
        />
        <line x1={16} y1={164} x2={BASE_W - 16} y2={164} className="stroke-brand-line" {...STROKE} />
      </g>
    ),
  },
]

function layersAt(scale: number): IsoStackLayer[] {
  return LAYERS.map((layer) => ({
    tone: layer.tone,
    content: scale === 1 ? layer.content : <g transform={`scale(${scale})`}>{layer.content}</g>,
  }))
}

type Geometry = {
  w: number
  h: number
  t: number
  r: number
  gap: number
  tx: number
  ty: number
  scale: number
}

function Stack({ g }: { g: Geometry }) {
  return (
    <>
      <StackGuides tx={g.tx} ty={g.ty} w={g.w} h={g.h} r={g.r} t={g.t} gap={g.gap} layers={LAYERS.length} />
      <Iso x={g.tx} y={g.ty}>
        <IsoStack layers={layersAt(g.scale)} w={g.w} h={g.h} t={g.t} r={g.r} gap={g.gap} />
      </Iso>
    </>
  )
}

const WIDE: Geometry = { w: BASE_W, h: BASE_H, t: 8, r: 8, gap: 64, tx: 474, ty: 276, scale: 1 }
const COMPACT: Geometry = { w: 150, h: 112.5, t: 6, r: 6, gap: 52, tx: 106, ty: 218, scale: 150 / BASE_W }

function WideCallouts() {
  const g = WIDE
  const k = cornerInset(g.r)
  const DX = 24
  return (
    <>
      {LAYERS.map((layer, i) => {
        const onRight = i % 2 === 0
        const [x, y] = onRight
          ? stackPoint(i, g.gap, g.w - k, k, g.tx, g.ty)
          : stackPoint(i, g.gap, k, g.h - k, g.tx, g.ty)
        // Labels line up on two columns: text starts at 752 / ends at 248.
        const run = onRight ? 746 - (x + DX) : x - DX - 254
        return (
          <Callout
            key={layer.label}
            x={x}
            y={y}
            label={layer.label}
            dx={onRight ? DX : -DX}
            dy={0}
            run={run}
            fontSize={14}
            tone={layer.tone ?? "base"}
          />
        )
      })}
    </>
  )
}

function CompactCallouts() {
  const g = COMPACT
  const k = cornerInset(g.r)
  const DX = 16
  return (
    <>
      {LAYERS.map((layer, i) => {
        const [x, y] = stackPoint(i, g.gap, g.w - k, k, g.tx, g.ty)
        return (
          <Callout
            key={layer.label}
            x={x}
            y={y}
            label={layer.label}
            dx={DX}
            dy={0}
            run={274 - (x + DX)}
            fontSize={17}
            tone={layer.tone ?? "base"}
          />
        )
      })}
    </>
  )
}

export function ProductLayers({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 1000 510" role="img" aria-label={LABEL} className="mx-auto hidden h-auto w-full max-w-4xl lg:block">
        <Stack g={WIDE} />
        <WideCallouts />
      </svg>
      <svg viewBox="0 0 470 364" role="img" aria-label={LABEL} className="mx-auto h-auto w-full max-w-md lg:hidden">
        <Stack g={COMPACT} />
        <CompactCallouts />
      </svg>
    </div>
  )
}
