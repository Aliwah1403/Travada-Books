import { STROKE, cornerInset, isoPoint } from "~/components/illustrations/iso"
import { IllustrationFrame, StemLabel, type LabelsFrom } from "~/components/illustrations/frame"
import { Callout, Connector, Iso, IsoSlab, UiLines, UiPill } from "~/components/illustrations/kit"

// I11 — /payments hero (WEBSITE-REDO-PLAN.md §4 "Added feature pages"). An
// invoice with a progress ring (the part already paid, in brand), fed by a
// column of recorded payments — the latest one highlighted. No payment
// method names are drawn (WEBSITE-PLAN.md §5: M-Pesa only ever appears as
// a method you record, and it's safer to leave it out of the art).
//
// Callout size: viewBox 500 wide, 13-unit text. Shown with labels only at
// ≥ 505px (see frame.tsx), so text renders at ≥ 13.1px.

const LABEL =
  "An invoice with a progress ring showing the part already paid, fed by a column of recorded payments with the latest one highlighted"

const TX = 170
const TY = 97
const FONT = 13

// Invoice.
const IW = 160
const IH = 120
const IT = 8
const IR = 8
const RING_X = 104
const RING_Y = 62
const RING_R = 30
const PAID = 62 // percent of the ring drawn in brand

// Payment rows.
const RW = 88
const RH = 22
const RT = 4
const RR = 4
const RSTEP = 42
const ROWS = 3
const COLUMN_SHIFT = 118
const LATEST = ROWS - 1

function at(x: number, y: number) {
  return isoPoint(x, y, TX, TY)
}

function rowOrigin(i: number): [number, number] {
  const mid = (ROWS - 1) / 2
  const cx = IW / 2 + COLUMN_SHIFT + (i - mid) * RSTEP
  const cy = IH / 2 - COLUMN_SHIFT + (i - mid) * RSTEP
  return [cx - RW / 2, cy - RH / 2]
}

function Art() {
  const rk = cornerInset(RR)
  const ringEdge = at(RING_X + RING_R, RING_Y)
  return (
    <g>
      {/* Each payment feeds the ring */}
      {Array.from({ length: ROWS }, (_, i) => {
        const [x, y] = rowOrigin(i)
        const from = at(x + rk, y + RH - rk)
        return (
          <Connector
            key={i}
            from={[from[0], from[1] + RT / 2]}
            to={ringEdge}
            dashed={i !== LATEST}
            tone={i === LATEST ? "brand" : "base"}
            endDot={false}
          />
        )
      })}

      <Iso x={TX} y={TY}>
        {/* Invoice */}
        <IsoSlab w={IW} h={IH} t={IT} r={IR}>
          <UiLines x={14} y={14} widths={[46, 30]} size={3} pitch={9} />
          <UiPill x={14} y={38} w={40} h={12} />
          <UiLines x={14} y={66} widths={[52, 40, 46]} size={3} pitch={10} />
          {/* Balance due: a heavier bar near the front */}
          <line x1={14} y1={IH - 22} x2={IW - 14} y2={IH - 22} className="stroke-line" {...STROKE} />
          <rect x={IW - 62} y={IH - 14} width={48} height={5} rx={2.5} className="fill-ink-subtle" />
          {/* Progress ring */}
          <circle cx={RING_X} cy={RING_Y} r={RING_R} fill="none" className="stroke-line" strokeWidth={4} vectorEffect="non-scaling-stroke" />
          <circle
            cx={RING_X}
            cy={RING_Y}
            r={RING_R}
            fill="none"
            className="stroke-brand-line"
            strokeWidth={4}
            vectorEffect="non-scaling-stroke"
            pathLength={100}
            strokeDasharray={`${PAID} 100`}
            transform={`rotate(-90 ${RING_X} ${RING_Y})`}
          />
          <UiLines x={RING_X - 12} y={RING_Y - 5} widths={[24, 16]} size={3} pitch={7} />
        </IsoSlab>

        {/* Recorded payments */}
        {Array.from({ length: ROWS }, (_, i) => {
          const [x, y] = rowOrigin(i)
          const latest = i === LATEST
          return (
            <IsoSlab key={i} x={x} y={y} w={RW} h={RH} t={RT} r={RR} tone={latest ? "brand" : "base"}>
              <circle cx={11} cy={RH / 2} r={4.5} className={latest ? "fill-brand-soft stroke-brand-line" : "fill-canvas stroke-line-strong"} {...STROKE} />
              <UiLines x={22} y={RH / 2 - 1.5} widths={[26 + ((i * 7) % 10)]} size={3} tone={latest ? "brand" : "base"} />
              <UiLines x={RW - 26} y={RH / 2 - 1.5} widths={[16]} size={3} tone={latest ? "brand" : "base"} />
            </IsoSlab>
          )
        })}
      </Iso>
    </g>
  )
}

function Callouts() {
  const ik = cornerInset(IR)
  const [ix, iy] = at(ik, ik)
  const [rx, ry] = rowOrigin(0)
  const rowTop = at(rx + RW / 2, ry + RH / 2)
  const balance = at(IW - 14, IH - 11.5)
  return (
    <>
      <Callout x={ix} y={iy} label="Part-paid" dx={-20} dy={-26} run={10} fontSize={FONT} />
      <StemLabel x={rowTop[0]} y={rowTop[1]} label="Payments" length={-44} fontSize={FONT} brand />
      <StemLabel x={balance[0]} y={balance[1]} label="Balance due" length={58} fontSize={FONT} />
    </>
  )
}

export function PaymentLedger({
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
      compactViewBox="55 89 394 164"
      art={<Art />}
      callouts={<Callouts />}
      legend={[{ label: "Part-paid" }, { label: "Payments", brand: true }, { label: "Balance due" }]}
      labelsFrom={labelsFrom}
      className={className}
    />
  )
}
