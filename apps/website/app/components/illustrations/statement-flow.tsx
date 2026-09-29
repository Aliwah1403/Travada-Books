import { STROKE, cornerInset, isoPoint } from "~/components/illustrations/iso"
import { IllustrationFrame, StemLabel, type LabelsFrom } from "~/components/illustrations/frame"
import { revealStep } from "~/components/feature/mockups/reveal"
import { Callout, Connector, IsoSlab, IsoStep, UiLines, UiPill } from "~/components/illustrations/kit"

// I4 — home Statement import row and /statement-import hero
// (WEBSITE-REDO-PLAN.md §3). A left-to-right flow (Medusa "data → insights
// → actions"): three statement files → the highlighted Travada block →
// a column of categorised transaction rows.
//
// Each column is laid out straight down the screen: stepping (s, s) in
// flat space moves a shape down by s with no sideways drift (see iso.ts),
// so the source labels line up in one column on the left.
//
// Callout size: viewBox 560 wide, 14-unit text. Shown with labels only at
// ≥ 505px (see frame.tsx), so text renders at ≥ 12.6px.

const LABEL =
  "A flow diagram: a bank PDF, a bank CSV and a mobile money statement feed into Travada Books, which turns them into categorised transaction rows"

const FONT = 14

// Shared origin; every column is placed relative to it.
const TX = 232
const TY = 106

// Source files.
const SW = 64
const SH = 44
const ST = 5
const SR = 5
const SSTEP = 72
const SOURCES = ["Bank PDF", "Bank CSV", "Mobile money"]

// Travada block, centred level with the middle source.
const HW = 64
const HH = 64
const HT = 22
const HR = 8
const HUB_SHIFT = 66 // flat (+d, -d) → straight right on screen

// Output rows.
const RW = 84
const RH = 20
const RT = 4
const RR = 4
const RSTEP = 46
const ROWS = 4
const ROW_SHIFT = 150

function screen(x: number, y: number) {
  return isoPoint(x, y, TX, TY)
}

/** Flat origin of source card i. */
function sourceOrigin(i: number): [number, number] {
  return [i * SSTEP, i * SSTEP]
}

/** Flat origin of the hub: centre sits level with the middle card's centre. */
function hubOrigin(): [number, number] {
  const [mx, my] = sourceOrigin(1)
  const cx = mx + SW / 2 + HUB_SHIFT
  const cy = my + SH / 2 - HUB_SHIFT
  return [cx - HW / 2 - HT / 2, cy - HH / 2 - HT / 2]
}

/** Flat origin of output row i, a column centred on the hub's height. */
function rowOrigin(i: number): [number, number] {
  const [mx, my] = sourceOrigin(1)
  const mid = (ROWS - 1) / 2
  const cx = mx + SW / 2 + ROW_SHIFT + (i - mid) * RSTEP
  const cy = my + SH / 2 - ROW_SHIFT + (i - mid) * RSTEP
  return [cx - RW / 2, cy - RH / 2]
}

function SourceGlyph({ index }: { index: number }) {
  if (index === 0) {
    // PDF: a page with a folded corner.
    return (
      <g>
        <path d="M8,8 H22 L28,14 V36 H8 Z" className="fill-canvas stroke-line-strong" {...STROKE} />
        <UiLines x={34} y={10} widths={[22, 16, 20, 12]} size={3} pitch={7} />
      </g>
    )
  }
  if (index === 1) {
    // CSV: a small grid.
    return (
      <g className="stroke-line-strong" fill="none">
        <rect x={8} y={8} width={48} height={28} rx={2} className="fill-canvas" {...STROKE} />
        <line x1={8} y1={17} x2={56} y2={17} {...STROKE} />
        <line x1={8} y1={26} x2={56} y2={26} {...STROKE} />
        <line x1={24} y1={8} x2={24} y2={36} {...STROKE} />
        <line x1={40} y1={8} x2={40} y2={36} {...STROKE} />
      </g>
    )
  }
  // Mobile-money statement: rows with amounts on the right.
  return (
    <g>
      <UiLines x={8} y={9} widths={[26, 20, 30]} size={3} pitch={9} />
      <UiLines x={44} y={9} widths={[12, 12, 12]} size={3} pitch={9} />
    </g>
  )
}

function Art() {
  const [hx, hy] = hubOrigin()
  const hk = cornerInset(HR)
  const sk = cornerInset(SR)
  const rk = cornerInset(RR)
  // Hub silhouette extremes on its top face.
  const hubLeft = screen(hx + hk, hy + HH - hk)
  const hubRight = screen(hx + HW - hk, hy + hk)
  const hubLeftMid: [number, number] = [hubLeft[0], hubLeft[1] + HT / 2]
  const hubRightMid: [number, number] = [hubRight[0], hubRight[1] + HT / 2]

  // Built in reading order on first scroll-in (IsoStep/revealStep →
  // app.css): statements (step 0) → Travada (3) → categorised rows (6, 7,
  // 8 …). Paint order is unchanged: connectors first, then blocks.
  return (
    <g>
      <g {...revealStep(0)}>
        {SOURCES.map((_, i) => {
          const [x, y] = sourceOrigin(i)
          const from = screen(x + SW - sk, y + sk)
          return (
            <Connector
              key={i}
              from={[from[0], from[1] + ST / 2]}
              to={hubLeftMid}
              endDot={false}
            />
          )
        })}
      </g>
      <g {...revealStep(6)}>
        {Array.from({ length: ROWS }, (_, i) => {
          const [x, y] = rowOrigin(i)
          const to = screen(x + rk, y + RH - rk)
          return <Connector key={i} from={hubRightMid} to={[to[0], to[1] + RT / 2]} tone="brand" />
        })}
      </g>

      <IsoStep step={0} x={TX} y={TY}>
        {SOURCES.map((source, i) => {
          const [x, y] = sourceOrigin(i)
          return (
            <IsoSlab key={source} x={x} y={y} w={SW} h={SH} t={ST} r={SR}>
              <SourceGlyph index={i} />
            </IsoSlab>
          )
        })}
      </IsoStep>

      {/* Travada block (highlighted) */}
      <IsoStep step={3} x={TX} y={TY}>
        <IsoSlab x={hx} y={hy} w={HW} h={HH} t={HT} r={HR} tone="brand">
          <rect x={14} y={14} width={HW - 28} height={HH - 28} rx={6} className="fill-none stroke-brand-line" {...STROKE} />
          <UiLines x={22} y={24} widths={[20, 14, 18]} size={3} pitch={6} tone="brand" />
        </IsoSlab>
      </IsoStep>

      {Array.from({ length: ROWS }, (_, i) => {
        const [x, y] = rowOrigin(i)
        return (
          <IsoStep key={i} step={6 + i} x={TX} y={TY}>
            <IsoSlab x={x} y={y} w={RW} h={RH} t={RT} r={RR}>
              <UiLines x={8} y={8} widths={[22 + ((i * 9) % 14)]} size={3} />
              <UiPill x={46} y={5} w={30} h={10} tone={i === 1 ? "brand" : "base"} />
            </IsoSlab>
          </IsoStep>
        )
      })}
    </g>
  )
}

function Callouts() {
  const sk = cornerInset(SR)
  const hk = cornerInset(HR)
  const [hx, hy] = hubOrigin()
  const hubFront = screen(hx + HW - hk, hy + HH - hk)
  const [rx, ry] = rowOrigin(0)
  const rowTop = screen(rx + RW / 2, ry + RH / 2)
  return (
    <>
      <g {...revealStep(0)}>
        {SOURCES.map((source, i) => {
          const [x, y] = sourceOrigin(i)
          const [ax, ay] = screen(x + sk, y + SH - sk)
          // Labels right-align on one column ending at x = 156.
          return (
            <Callout key={source} x={ax} y={ay} label={source} dx={-14} dy={0} run={ax - 14 - 162} fontSize={FONT} />
          )
        })}
      </g>
      <g {...revealStep(3)}>
        <StemLabel x={hubFront[0]} y={hubFront[1] + HT} label="Travada Books" length={40} fontSize={FONT} brand />
      </g>
      <g {...revealStep(6)}>
        <StemLabel x={rowTop[0]} y={rowTop[1]} label="Categorised" length={-44} fontSize={FONT} />
      </g>
    </>
  )
}

export function StatementFlow({
  className,
  labelsFrom = "sm",
}: {
  className?: string
  labelsFrom?: LabelsFrom
}) {
  return (
    <IllustrationFrame
      label={LABEL}
      viewBox="0 0 560 380"
      compactViewBox="184 98 371 219"
      art={<Art />}
      callouts={<Callouts />}
      legend={[
        { label: "Bank PDF" },
        { label: "Bank CSV" },
        { label: "Mobile money" },
        { label: "Travada Books", brand: true },
        { label: "Categorised" },
      ]}
      labelsFrom={labelsFrom}
      className={className}
    />
  )
}
