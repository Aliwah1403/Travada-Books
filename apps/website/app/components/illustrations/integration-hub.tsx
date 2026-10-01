import type { ReactNode } from "react"

import { STROKE, cornerInset, isoPoint } from "~/components/illustrations/iso"
import { IllustrationFrame, StemLabel, type LabelsFrom } from "~/components/illustrations/frame"
import { Callout, Iso, IsoSlab, UiLines } from "~/components/illustrations/kit"

// I6 — /integrations hero (WEBSITE-REDO-PLAN.md §3). The highlighted
// Travada hub plate sits in the middle of the ground plane with a spoke
// running along each iso axis to a provider tile: the two inboxes on the
// left, the two statement imports on the right. Two faded, dashed "slots"
// on the diagonal are the roadmap — no tile has landed there yet.
// Abstract glyphs only: no brand marks inside the SVG.
//
// Everything rests on one ground plane: a slab of thickness t whose
// bottom face is centred on flat point C has its origin at C − (w/2 + t),
// and spokes are drawn flat on that plane, under the slabs.
//
// Callout size: viewBox 480 wide, 14-unit text. Shown with labels only at
// ≥ 505px (see frame.tsx), so text renders at ≥ 14.7px.

const LABEL =
  "An isometric hub: the Travada Books plate in the centre, with spokes to Gmail, Outlook, bank statement and M-Pesa statement tiles, and two empty slots for integrations that are coming soon"

const TX = 240
const TY = 212
const FONT = 14

// Hub plate (highlighted).
const HW = 88
const HT = 24
const HR = 10

// Provider tiles.
const TW = 56
const TT = 8
const TR = 8
const REACH = 160 // flat distance from the hub centre along an axis
const SOON_REACH = 118 // along the (1, 1) diagonal, i.e. straight down/up the screen

type TileId = "gmail" | "outlook" | "bank" | "mpesa"
type SoonId = "cards" | "chat"

const TILES: { id: TileId; label: string; at: [number, number]; above: boolean }[] = [
  { id: "gmail", label: "Gmail", at: [-REACH, 0], above: true }, // top left
  { id: "bank", label: "Bank statement", at: [0, -REACH], above: true }, // top right
  { id: "outlook", label: "Outlook", at: [0, REACH], above: false }, // bottom left
  { id: "mpesa", label: "M-Pesa statement", at: [REACH, 0], above: false }, // bottom right
]

const SOON: { id: SoonId; at: [number, number]; above: boolean }[] = [
  { id: "cards", at: [-SOON_REACH, -SOON_REACH], above: true },
  { id: "chat", at: [SOON_REACH, SOON_REACH], above: false },
]

function screen(x: number, y: number) {
  return isoPoint(x, y, TX, TY)
}

/** Top-face origin of a slab whose bottom face is centred on `c`. */
function restingOrigin([cx, cy]: [number, number], w: number, t: number): [number, number] {
  return [cx - w / 2 - t, cy - w / 2 - t]
}

/* --------------------------------- Glyphs --------------------------------- */
// Drawn flat on a tile's top face, in a 56 × 56 box.

function Envelope({ badge = false }: { badge?: boolean }) {
  return (
    <g>
      <rect x={14} y={16} width={30} height={24} rx={2} className="fill-canvas stroke-line-strong" {...STROKE} />
      <polyline points="14,17 29,29 44,17" fill="none" className="stroke-line-strong" {...STROKE} />
      {badge ? (
        <g>
          <rect x={8} y={24} width={14} height={14} rx={2} className="fill-panel stroke-line-strong" {...STROKE} />
          <circle cx={15} cy={31} r={3.5} fill="none" className="stroke-line-strong" {...STROKE} />
        </g>
      ) : null}
    </g>
  )
}

function Bank() {
  return (
    <g fill="none" className="stroke-line-strong">
      <polygon points="12,22 28,12 44,22" className="fill-canvas" {...STROKE} />
      {[17, 24, 32, 39].map((x) => (
        <line key={x} x1={x} y1={25} x2={x} y2={38} {...STROKE} />
      ))}
      <line x1={12} y1={41} x2={44} y2={41} {...STROKE} />
    </g>
  )
}

function Phone() {
  return (
    <g>
      <rect x={18} y={8} width={22} height={40} rx={4} className="fill-canvas stroke-line-strong" {...STROKE} />
      <UiLines x={22} y={15} widths={[10, 14, 8, 12]} size={3} pitch={7} />
      <UiLines x={34} y={15} widths={[3, 3, 3, 3]} size={3} pitch={7} />
    </g>
  )
}

function Card() {
  return (
    <g fill="none" className="stroke-line-strong">
      <rect x={10} y={16} width={36} height={24} rx={3} {...STROKE} />
      <line x1={10} y1={23} x2={46} y2={23} {...STROKE} />
      <line x1={15} y1={33} x2={25} y2={33} {...STROKE} />
    </g>
  )
}

function Chat() {
  return (
    <path
      d="M14,14 H42 A3,3 0 0 1 45,17 V34 A3,3 0 0 1 42,37 H24 L16,43 V37 H14 A3,3 0 0 1 11,34 V17 A3,3 0 0 1 14,14 Z"
      fill="none"
      className="stroke-line-strong"
      {...STROKE}
    />
  )
}

const GLYPH: Record<TileId | SoonId, ReactNode> = {
  gmail: <Envelope />,
  outlook: <Envelope badge />,
  bank: <Bank />,
  mpesa: <Phone />,
  cards: <Card />,
  chat: <Chat />,
}

/* ---------------------------------- Art ----------------------------------- */

function Spoke({ to, soon = false }: { to: [number, number]; soon?: boolean }) {
  const [x, y] = to
  const len = Math.hypot(x, y)
  // Stop at the tile's near edge (axis spokes) or its near corner (diagonals).
  const stop = soon ? len - (TW / 2) * Math.SQRT2 : len - TW / 2
  const ex = (x / len) * stop
  const ey = (y / len) * stop
  return (
    <g>
      <line
        x1={0}
        y1={0}
        x2={ex}
        y2={ey}
        className="stroke-line-strong"
        strokeDasharray={soon ? "4 4" : undefined}
        {...STROKE}
      />
      {soon ? null : <circle cx={ex} cy={ey} r={3} className="fill-panel stroke-line-strong" {...STROKE} />}
    </g>
  )
}

function Tile({ id, at }: { id: TileId; at: [number, number] }) {
  const [x, y] = restingOrigin(at, TW, TT)
  return (
    <IsoSlab x={x} y={y} w={TW} h={TW} t={TT} r={TR}>
      {GLYPH[id]}
    </IsoSlab>
  )
}

// A roadmap slot: a dashed outline on the ground and a faded glyph — the
// tile hasn't landed yet.
function Slot({ id, at }: { id: SoonId; at: [number, number] }) {
  const [cx, cy] = at
  return (
    <g transform={`translate(${cx - TW / 2} ${cy - TW / 2})`}>
      <rect width={TW} height={TW} rx={TR} className="fill-canvas stroke-line-strong" strokeDasharray="4 4" {...STROKE} />
      <g opacity={0.55}>{GLYPH[id]}</g>
    </g>
  )
}

function Hub() {
  const [x, y] = restingOrigin([0, 0], HW, HT)
  return (
    <IsoSlab x={x} y={y} w={HW} h={HW} t={HT} r={HR} tone="brand">
      <rect x={16} y={16} width={HW - 32} height={HW - 32} rx={6} className="fill-none stroke-brand-line" {...STROKE} />
      <UiLines x={26} y={30} widths={[26, 18, 22]} size={4} pitch={9} tone="brand" />
    </IsoSlab>
  )
}

// Painter's order: back to front by x + y of the resting centre.
function Art() {
  const back = TILES.filter((tile) => tile.above)
  const front = TILES.filter((tile) => !tile.above)
  return (
    <Iso x={TX} y={TY}>
      {SOON.map((slot) => (
        <Spoke key={slot.id} to={slot.at} soon />
      ))}
      {TILES.map((tile) => (
        <Spoke key={tile.id} to={tile.at} />
      ))}
      <Slot id="cards" at={SOON[0].at} />
      {back.map((tile) => (
        <Tile key={tile.id} id={tile.id} at={tile.at} />
      ))}
      <Hub />
      {front.map((tile) => (
        <Tile key={tile.id} id={tile.id} at={tile.at} />
      ))}
      <Slot id="chat" at={SOON[1].at} />
    </Iso>
  )
}

/* -------------------------------- Callouts -------------------------------- */

function Callouts() {
  const tk = cornerInset(TR)
  const hk = cornerInset(HR)
  const [hx, hy] = restingOrigin([0, 0], HW, HT)
  // The hub's right silhouette point, halfway down its side.
  const hubRight = screen(hx + HW - hk, hy + hk)
  return (
    <>
      {TILES.map(({ id, label, at, above }) => {
        const [ox, oy] = restingOrigin(at, TW, TT)
        // Top tiles: the back corner of the top face. Bottom tiles: the
        // front corner of the bottom edge.
        const [ax, ay] = above ? screen(ox + tk, oy + tk) : screen(ox + TW - tk, oy + TW - tk)
        return (
          <StemLabel
            key={id}
            x={ax}
            y={above ? ay : ay + TT}
            label={label}
            length={above ? -26 : 26}
            fontSize={FONT}
          />
        )
      })}
      {SOON.map(({ id, at, above }) => {
        const [cx, cy] = at
        const half = TW / 2 - tk
        const [ax, ay] = above ? screen(cx - half, cy - half) : screen(cx + half, cy + half)
        return (
          <StemLabel key={id} x={ax} y={ay} label="Soon" length={above ? -22 : 22} fontSize={FONT} />
        )
      })}
      {/* Sits between the two right-hand spokes. */}
      <Callout
        x={hubRight[0]}
        y={hubRight[1] + HT / 2}
        label="Travada Books"
        dx={20}
        dy={0}
        run={6}
        fontSize={FONT}
        tone="brand"
      />
    </>
  )
}

export function IntegrationHub({
  className,
  labelsFrom = "sm",
}: {
  className?: string
  labelsFrom?: LabelsFrom
}) {
  return (
    <IllustrationFrame
      label={LABEL}
      viewBox="0 0 480 420"
      compactViewBox="40 40 400 340"
      art={<Art />}
      callouts={<Callouts />}
      legend={[
        { label: "Gmail" },
        { label: "Outlook" },
        { label: "Bank statement" },
        { label: "M-Pesa statement" },
        { label: "Travada Books", brand: true },
        { label: "Soon" },
      ]}
      labelsFrom={labelsFrom}
      className={className}
    />
  )
}
