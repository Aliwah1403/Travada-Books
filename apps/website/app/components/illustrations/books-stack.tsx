import { cn } from "@travada-books/ui/lib/utils"

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
} from "~/components/illustrations/kit"

// I1 — home hero (WEBSITE-REDO-PLAN.md §3). An exploded stack of the four
// things the books are made of: Books at the bottom, then Receipts,
// Statements and — highlighted on top — Invoices.
//
// Two renders of one geometry: the full version (sm+) with mono callouts
// on both sides, and a compact crop (< sm) without in-SVG text, followed by
// an HTML legend so no label ever renders below 12px on a phone.
//
// Callout size check: viewBox is 600 wide; the hero column is ≥ ~490px
// wide from lg up (and ≥ 540px when stacked, sm–lg), so 15-unit text
// renders at ≥ 12.2px.

const W = 200
const H = 140
const T = 8
const R = 8
const GAP = 78
const TX = 274
const TY = 248
const FONT = 15
const K = cornerInset(R)

const LABEL = "An exploded stack of four layers: books at the bottom, then receipts, statements, and invoices highlighted on top"

function at(layer: number, x: number, y: number) {
  return stackPoint(layer, GAP, x, y, TX, TY)
}

/** A receipt slip drawn flat: straight top, zigzag bottom edge. */
function Receipt({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const teeth = 5
  const step = w / teeth
  let d = `M${x},${y} H${x + w} V${y + h}`
  for (let i = teeth - 1; i >= 0; i--) {
    d += ` L${x + i * step + step / 2},${y + h - 4} L${x + i * step},${y + h}`
  }
  d += " Z"
  return (
    <g>
      <path d={d} className="fill-panel stroke-line-strong" {...STROKE} />
      <UiLines x={x + 7} y={y + 9} widths={[w * 0.55, w * 0.7, w * 0.4]} size={3} pitch={8} />
      <line x1={x + 7} y1={y + h - 20} x2={x + w - 7} y2={y + h - 20} className="stroke-line" {...STROKE} />
      <UiLines x={x + w - 7 - w * 0.35} y={y + h - 15} widths={[w * 0.35]} size={3} />
    </g>
  )
}

const layers: IsoStackLayer[] = [
  // 0 — Books: a small bar chart over a header line.
  {
    content: (
      <g>
        <UiLines x={16} y={16} widths={[64, 40]} pitch={9} />
        {[34, 52, 40, 66, 58, 80].map((bar, i) => (
          <rect
            key={i}
            x={18 + i * 26}
            y={128 - bar}
            width={14}
            height={bar}
            rx={2}
            className="fill-canvas stroke-line-strong"
            {...STROKE}
          />
        ))}
        <line x1={12} y1={128} x2={W - 12} y2={128} className="stroke-line-strong" {...STROKE} />
      </g>
    ),
  },
  // 1 — Receipts: three slips.
  {
    content: (
      <g>
        <Receipt x={14} y={26} w={48} h={80} />
        <Receipt x={71} y={20} w={48} h={92} />
        <Receipt x={128} y={30} w={48} h={74} />
      </g>
    ),
  },
  // 2 — Statements: a ledger with money-in / money-out columns.
  {
    content: (
      <g>
        <UiLines x={16} y={16} widths={[70]} />
        {[0, 1, 2, 3, 4].map((row) => {
          const y = 34 + row * 20
          return (
            <g key={row}>
              <line x1={14} y1={y} x2={W - 14} y2={y} className="stroke-line" {...STROKE} />
              <UiLines x={18} y={y + 8} widths={[58 + ((row * 17) % 30)]} />
              <UiLines x={row % 2 ? 150 : 118} y={y + 8} widths={[24]} />
            </g>
          )
        })}
      </g>
    ),
  },
  // 3 — Invoices (highlighted): customer, status, line items, send.
  {
    tone: "brand",
    content: (
      <g>
        <UiAvatar cx={24} cy={24} r={9} tone="brand" />
        <UiLines x={40} y={17} widths={[62, 38]} pitch={9} tone="brand" />
        <UiPill x={134} y={17} w={40} h={13} tone="brand" />
        <UiLines x={16} y={54} widths={[120, 96, 110]} pitch={13} tone="brand" />
        <UiLines x={150} y={54} widths={[24, 24, 24]} pitch={13} tone="brand" />
        <UiButton x={16} y={112} w={58} h={18} tone="brand" />
        <UiLines x={128} y={119} widths={[46]} tone="brand" />
      </g>
    ),
  },
]

function Stack() {
  return (
    <>
      <StackGuides tx={TX} ty={TY} w={W} h={H} r={R} t={T} gap={GAP} layers={layers.length} />
      <Iso x={TX} y={TY}>
        <IsoStack layers={layers} w={W} h={H} t={T} r={R} gap={GAP} />
      </Iso>
    </>
  )
}

export function BooksStack({ className }: { className?: string }) {
  const right = (layer: number) => at(layer, W - K, K)
  const left = (layer: number) => at(layer, K, H - K)
  const [ix, iy] = right(3)
  const [sx, sy] = left(2)
  const [rx, ry] = right(1)
  const [bx, by] = left(0)

  return (
    <div className={className}>
      <svg viewBox="0 0 600 440" role="img" aria-label={LABEL} className="hidden h-auto w-full sm:block">
        <Stack />
        <Callout x={ix} y={iy} label="Invoices" dx={24} dy={-22} run={14} fontSize={FONT} tone="brand" />
        <Callout x={sx} y={sy} label="Statements" dx={-24} dy={-18} run={14} fontSize={FONT} />
        <Callout x={rx} y={ry} label="Receipts" dx={24} dy={18} run={14} fontSize={FONT} />
        <Callout x={bx} y={by} label="Books" dx={-24} dy={22} run={14} fontSize={FONT} />
      </svg>

      <div className="sm:hidden">
        <svg viewBox="143 6 314 428" role="img" aria-label={LABEL} className="mx-auto h-auto w-full max-w-xs">
          <Stack />
        </svg>
        <ul
          aria-hidden="true"
          className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 font-mono text-xs tracking-wide text-ink-muted uppercase"
        >
          {["Invoices", "Statements", "Receipts", "Books"].map((label, i) => (
            <li key={label} className="flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", i === 0 ? "bg-brand-line" : "bg-ink-subtle")} />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
