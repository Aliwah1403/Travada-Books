import { STROKE, cornerInset, isoPoint } from "~/components/illustrations/iso"
import { IllustrationFrame, type LabelsFrom } from "~/components/illustrations/frame"
import { Callout, Iso, IsoSlab, UiLines, UiPill } from "~/components/illustrations/kit"

// I10 — /customer-portal hero (WEBSITE-REDO-PLAN.md §4 "Added feature
// pages"). One browser window — the customer's portal link — with the
// balance due raised and highlighted, and a deck of the customer's
// documents (invoices, quotes, statements) stacked beside it.
// ⚠️ No M-Pesa here: the portal is invoicing content (WEBSITE-PLAN.md §5).
//
// Callout size: viewBox 500 wide, 13-unit text. Shown with labels only at
// ≥ 505px (see frame.tsx), so text renders at ≥ 13.1px.

const LABEL =
  "A browser window for the customer's portal, with the balance due highlighted and a deck of invoices, quotes and statements stacked beside it"

const TX = 212
const TY = 70
const FONT = 13

// Window.
const WW = 232
const WH = 168
const WT = 8
const WR = 10
const BAR = 20

// Balance card (highlighted), resting on the window.
const BX = 16
const BY = 100
const BW = 92
const BH = 54
const BT = 6
const BR = 6

// Document deck, resting on the window.
const DX = 132
const DY = BAR + 12
const DW = 90
const DH = 60
const DT = 3
const DR = 5
const DGAP = 20
const DECK = ["Statements", "Quotes", "Invoices"] // bottom → top

function at(x: number, y: number, lift = 0) {
  return isoPoint(x - lift, y - lift, TX, TY)
}

function deckLift(i: number) {
  return DT + i * DGAP
}

function Art() {
  return (
    <Iso x={TX} y={TY}>
      {/* The portal window */}
      <IsoSlab w={WW} h={WH} t={WT} r={WR}>
        <line x1={0} y1={BAR} x2={WW} y2={BAR} className="stroke-line-strong" {...STROKE} />
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={12 + i * 10} cy={BAR / 2} r={2.5} className="fill-canvas stroke-line-strong" {...STROKE} />
        ))}
        <UiPill x={52} y={5} w={110} h={10} />
        {/* Invoice rows beside the deck */}
        {[0, 1, 2].map((row) => {
          const y = BAR + 16 + row * 20
          return (
            <g key={row}>
              <UiLines x={16} y={y + 4} widths={[36 + ((row * 13) % 20)]} size={3} />
              <UiPill x={80} y={y + 1} w={26} h={9} />
              <line x1={14} y1={y + 14} x2={112} y2={y + 14} className="stroke-line" {...STROKE} />
            </g>
          )
        })}
        {/* Totals beside the balance */}
        <UiLines x={BX + BW + 16} y={BY + 10} widths={[60, 44, 52]} size={3} pitch={14} />
      </IsoSlab>

      {/* Balance due (highlighted) */}
      <IsoSlab x={BX - BT} y={BY - BT} w={BW} h={BH} t={BT} r={BR} tone="brand">
        <UiLines x={10} y={10} widths={[34]} size={3} tone="brand" />
        <rect x={10} y={22} width={58} height={10} rx={2} className="fill-brand-line/60" />
        <UiLines x={10} y={40} widths={[44]} size={3} tone="brand" />
      </IsoSlab>

      {/* Document deck */}
      {DECK.map((doc, i) => {
        const lift = deckLift(i)
        return (
          <IsoSlab key={doc} x={DX - lift} y={DY - lift} w={DW} h={DH} t={DT} r={DR}>
            <UiLines x={10} y={10} widths={[30, 20]} size={3} pitch={8} />
            <UiLines x={10} y={32} widths={[56, 44]} size={3} pitch={8} />
            <UiLines x={DW - 26} y={32} widths={[16]} size={3} />
          </IsoSlab>
        )
      })}
    </Iso>
  )
}

function Callouts() {
  const bk = cornerInset(BR)
  const [bx, by] = at(BX + bk, BY + bk, BT)
  const dk = cornerInset(DR)
  return (
    <>
      <Callout x={bx} y={by} label="Balance due" dx={-18} dy={-28} run={8} fontSize={FONT} tone="brand" />
      {DECK.map((doc, i) => {
        const [x, y] = at(DX + DW - dk, DY + dk, deckLift(i))
        return (
          <Callout key={doc} x={x} y={y} label={doc} dx={18} dy={(1 - i) * 22} run={8} fontSize={FONT} />
        )
      })}
    </>
  )
}

export function PortalWindow({
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
      compactViewBox="57 62 366 224"
      art={<Art />}
      callouts={<Callouts />}
      legend={[
        { label: "Balance due", brand: true },
        { label: "Invoices" },
        { label: "Quotes" },
        { label: "Statements" },
      ]}
      labelsFrom={labelsFrom}
      className={className}
    />
  )
}
