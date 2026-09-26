import { STROKE, cornerInset, isoPoint } from "~/components/illustrations/iso"
import { IllustrationFrame, StemLabel, type LabelsFrom } from "~/components/illustrations/frame"
import { Callout, Connector, Iso, IsoSlab, UiAvatar, UiButton, UiLines, UiPill } from "~/components/illustrations/kit"

// I9 — /quotes hero (WEBSITE-REDO-PLAN.md §4 "Added feature pages"). A quote
// with its Accept / Decline buttons, an "accepted" check lifting off it, and
// a curve down into the draft invoice it becomes — the highlighted slab.
// ⚠️ No M-Pesa here: quotes are invoicing content (WEBSITE-PLAN.md §5).
//
// Callout size: viewBox 500 wide, 13-unit text. Shown with labels only at
// ≥ 505px (see frame.tsx), so text renders at ≥ 13.1px.

const LABEL =
  "A quote with accept and decline buttons, an accepted check lifting off it, and a curve into the draft invoice it becomes, highlighted"

const TX = 204
const TY = 48
const FONT = 13

// Quote.
const QW = 124
const QH = 92
const QT = 6
const QR = 7

// Accepted check, floating over the quote.
const BX = 72
const BY = 12
const BW = 40
const BH = 26
const BT = 4
const BLIFT = 30

// Draft invoice (highlighted).
const IX = 190
const IY = 30
const IW = 124
const IH = 92
const IT = 6
const IR = 7

function at(x: number, y: number, lift = 0) {
  return isoPoint(x - lift, y - lift, TX, TY)
}

function Art() {
  const qk = cornerInset(QR)
  const ik = cornerInset(IR)
  // Quote's front tip (bottom of its thickness) → invoice's left corner.
  const from = at(QW - qk, QH - qk)
  const to = at(IX + ik, IY + IH - ik)
  return (
    <g>
      <Iso x={TX} y={TY}>
        {/* Quote */}
        <IsoSlab w={QW} h={QH} t={QT} r={QR}>
          <UiAvatar cx={16} cy={16} r={7} />
          <UiLines x={30} y={11} widths={[34, 22]} size={3} pitch={8} />
          <UiLines x={12} y={38} widths={[70, 56, 62]} size={3} pitch={9} />
          <UiLines x={96} y={38} widths={[16, 16, 16]} size={3} pitch={9} />
          <UiButton x={12} y={72} w={40} h={11} />
          <UiButton x={58} y={72} w={32} h={11} />
        </IsoSlab>
      </Iso>

      {/* Accepted → invoice */}
      <Connector from={[from[0], from[1] + QT]} to={[to[0], to[1] + IT / 2]} axis="vertical" tone="brand" />

      <Iso x={TX} y={TY}>
        {/* Accepted check */}
        <IsoSlab x={BX - BLIFT} y={BY - BLIFT} w={BW} h={BH} t={BT} r={5}>
          <circle cx={13} cy={BH / 2} r={6} className="fill-canvas stroke-line-strong" {...STROKE} />
          <path d={`M10,${BH / 2} L12.5,${BH / 2 + 2.5} L16.5,${BH / 2 - 2.5}`} fill="none" className="stroke-ink-muted" {...STROKE} />
          <UiLines x={23} y={BH / 2 - 1.5} widths={[11]} size={3} />
        </IsoSlab>

        {/* Draft invoice (highlighted) */}
        <IsoSlab x={IX} y={IY} w={IW} h={IH} t={IT} r={IR} tone="brand">
          <UiAvatar cx={16} cy={16} r={7} tone="brand" />
          <UiLines x={30} y={11} widths={[34, 22]} size={3} pitch={8} tone="brand" />
          <UiPill x={86} y={10} w={28} h={11} tone="brand" />
          <UiLines x={12} y={38} widths={[70, 56, 62]} size={3} pitch={9} tone="brand" />
          <UiLines x={96} y={38} widths={[16, 16, 16]} size={3} pitch={9} tone="brand" />
          <UiButton x={12} y={72} w={40} h={11} tone="brand" />
        </IsoSlab>
      </Iso>
    </g>
  )
}

function Callouts() {
  const qk = cornerInset(QR)
  const [qx, qy] = at(qk, QH - qk)
  const bk = cornerInset(5)
  const [bx, by] = at(BX + BW - bk, BY + bk, BLIFT)
  const ik = cornerInset(IR)
  const [ix, iy] = at(IX + IW - ik, IY + IH - ik)
  return (
    <>
      <Callout x={qx} y={qy} label="Quote" dx={-20} dy={-20} run={10} fontSize={FONT} />
      <Callout x={bx} y={by} label="Accepted" dx={20} dy={-30} run={10} fontSize={FONT} />
      <StemLabel x={ix} y={iy + IT} label="Draft invoice" length={34} fontSize={FONT} brand />
    </>
  )
}

export function QuoteToInvoice({
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
      compactViewBox="115 40 345 240"
      art={<Art />}
      callouts={<Callouts />}
      legend={[{ label: "Quote" }, { label: "Accepted" }, { label: "Draft invoice", brand: true }]}
      labelsFrom={labelsFrom}
      className={className}
    />
  )
}
