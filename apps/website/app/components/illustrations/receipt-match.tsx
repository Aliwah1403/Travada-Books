import { STROKE, cornerInset, isoPoint } from "~/components/illustrations/iso"
import { IllustrationFrame, type LabelsFrom } from "~/components/illustrations/frame"
import { revealStep } from "~/components/feature/mockups/reveal"
import { Callout, Connector, IsoSlab, IsoStep, UiLines, UiPill } from "~/components/illustrations/kit"

// I5 — home Inbox row and /inbox hero (WEBSITE-REDO-PLAN.md §3). An
// envelope (the connected Gmail or Outlook inbox) sends a receipt card up
// and over; it hovers above the matching transaction — the highlighted
// slab — lined up with the slot it drops into (Medusa's modular pieces).
//
// Callout size: viewBox 500 wide, 13-unit text. Shown with labels only at
// ≥ 505px (see frame.tsx), so text renders at ≥ 13.1px.

const LABEL =
  "An envelope from a connected inbox sends a receipt that lines up with the slot on its matching transaction, highlighted"

const TX = 202
const TY = 101
const FONT = 13

// Envelope.
const EX = -84
const EY = 10
const EW = 84
const EH = 58
const ET = 6
const ER = 5

// Transactions plate under the match.
const PX = 40
const PY = 30
const PW = 220
const PH = 170
const PT = 8

// Transaction slab (highlighted), resting on the plate.
const TXN_X = 56
const TXN_Y = 58
const TW = 170
const TH = 76
const TT = 10
const TR = 8

// Slot on the transaction's top face, and the receipt that fits it.
const SLOT_X = 100
const SLOT_Y = 16
const SLOT_W = 56
const SLOT_H = 44
const RT = 4
const LIFT = 90 // above the plate, so 80 above the transaction

function at(x: number, y: number, lift = 0) {
  return isoPoint(x - lift, y - lift, TX, TY)
}

// Receipt flat origin (absolute), directly above the slot.
const RX = TXN_X + SLOT_X
const RY = TXN_Y + SLOT_Y

function Art() {
  const ek = cornerInset(ER)
  const envRight = at(EX + EW - ek, EY + ek)
  const rk = cornerInset(4)
  const recLeft = at(RX + rk, RY + SLOT_H - rk, LIFT)

  // Guides: the receipt's left, front and right silhouette points, straight
  // down to the same points on the slot.
  const guides: [number, number][] = [
    [RX + rk, RY + SLOT_H - rk],
    [RX + SLOT_W - rk, RY + SLOT_H - rk],
    [RX + SLOT_W - rk, RY + rk],
  ]

  // Built on first scroll-in (IsoStep → app.css): inbox (step 0) →
  // transactions and the matched row (2–3) → the path (5) → the receipt (6)
  // → guides dropping it into its slot (8). Paint order is unchanged.
  return (
    <g>
      <IsoStep step={0} x={TX} y={TY}>
        {/* Envelope: flap drawn on the top face */}
        <IsoSlab x={EX} y={EY} w={EW} h={EH} t={ET} r={ER}>
          <path
            d={`M4,4 L${EW / 2},${EH * 0.55} L${EW - 4},4`}
            fill="none"
            className="stroke-line-strong"
            {...STROKE}
          />
          <UiLines x={10} y={EH - 14} widths={[30]} size={3} />
        </IsoSlab>
      </IsoStep>

      <IsoStep step={2} x={TX} y={TY}>
        {/* Transactions list the match sits in */}
        <IsoSlab x={PX} y={PY} w={PW} h={PH} t={PT} r={10}>
          {[0, 1].map((row) => (
            <g key={row}>
              <line x1={14} y1={PH - 44 + row * 22} x2={PW - 14} y2={PH - 44 + row * 22} className="stroke-line" {...STROKE} />
              <UiLines x={20} y={PH - 36 + row * 22} widths={[60 - row * 14]} size={3} />
              <UiLines x={PW - 50} y={PH - 36 + row * 22} widths={[26]} size={3} />
            </g>
          ))}
        </IsoSlab>
      </IsoStep>

      <IsoStep step={3} x={TX} y={TY}>
        {/* Matched transaction (highlighted) with its receipt slot */}
        <IsoSlab x={TXN_X - TT} y={TXN_Y - TT} w={TW} h={TH} t={TT} r={TR} tone="brand">
          <UiLines x={14} y={16} widths={[48, 30]} size={3} pitch={9} tone="brand" />
          <UiLines x={14} y={46} widths={[36]} size={3} tone="brand" />
          <UiPill x={14} y={56} w={34} h={11} tone="brand" />
          <rect
            x={SLOT_X}
            y={SLOT_Y}
            width={SLOT_W}
            height={SLOT_H}
            rx={4}
            className="fill-panel stroke-brand-line"
            strokeDasharray="3 3"
            {...STROKE}
          />
        </IsoSlab>
      </IsoStep>

      <g {...revealStep(8)} className="stroke-brand-line" fill="none">
        {guides.map(([x, y]) => {
          const [x1, y1] = at(x, y, LIFT - RT)
          const [, y2] = at(x, y, TT)
          return <line key={`${x}-${y}`} x1={x1} y1={y1} x2={x1} y2={y2} strokeDasharray="3 4" {...STROKE} />
        })}
      </g>

      <g {...revealStep(5)}>
        <Connector
          from={[envRight[0], envRight[1] + ET / 2]}
          to={[recLeft[0], recLeft[1] + RT / 2]}
          dashed
          endDot={false}
        />
      </g>

      <IsoStep step={6} x={TX} y={TY}>
        {/* The receipt, lined up over the slot */}
        <IsoSlab x={RX - LIFT} y={RY - LIFT} w={SLOT_W} h={SLOT_H} t={RT} r={4}>
          <UiLines x={8} y={8} widths={[26, 18]} size={3} pitch={7} />
          <line x1={8} y1={28} x2={SLOT_W - 8} y2={28} className="stroke-line" {...STROKE} />
          <UiLines x={SLOT_W - 26} y={33} widths={[18]} size={3} />
        </IsoSlab>
      </IsoStep>
    </g>
  )
}

function Callouts() {
  const ek = cornerInset(ER)
  const [ex, ey] = at(EX + ek, EY + ek)
  const rk = cornerInset(4)
  const [rx, ry] = at(RX + SLOT_W - rk, RY + rk, LIFT)
  const tk = cornerInset(TR)
  const [tx, ty] = at(TXN_X + TW - tk, TXN_Y + tk, TT)
  return (
    <>
      <g {...revealStep(0)}>
        <Callout x={ex} y={ey} label="Gmail · Outlook" dx={16} dy={-34} run={10} fontSize={FONT} />
      </g>
      <g {...revealStep(6)}>
        <Callout x={rx} y={ry} label="Receipt" dx={22} dy={-22} run={10} fontSize={FONT} />
      </g>
      <g {...revealStep(3)}>
        <Callout x={tx} y={ty} label="Matched" dx={30} dy={40} run={8} fontSize={FONT} tone="brand" />
      </g>
    </>
  )
}

export function ReceiptMatch({
  className,
  labelsFrom = "sm",
}: {
  className?: string
  labelsFrom?: LabelsFrom
}) {
  return (
    <IllustrationFrame
      label={LABEL}
      viewBox="0 0 500 360"
      compactViewBox="54 56 357 291"
      art={<Art />}
      callouts={<Callouts />}
      legend={[{ label: "Gmail · Outlook" }, { label: "Receipt" }, { label: "Matched", brand: true }]}
      labelsFrom={labelsFrom}
      className={className}
    />
  )
}
