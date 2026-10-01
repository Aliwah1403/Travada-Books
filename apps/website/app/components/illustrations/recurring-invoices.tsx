import { STROKE, cornerInset, isoPoint } from "~/components/illustrations/iso"
import { IllustrationFrame, type LabelsFrom } from "~/components/illustrations/frame"
import { revealStep } from "~/components/feature/mockups/reveal"
import { Callout, IsoSlab, IsoStep, UiAvatar, UiButton, UiLines, UiPill } from "~/components/illustrations/kit"

// I3 — home Invoicing row and /invoicing hero (WEBSITE-REDO-PLAN.md §3).
// A schedule plate: a rail of monthly send dates runs along its back edge
// (sent, sent, next, upcoming), a reminder card hangs off the rail, and a
// stack of invoice sheets — the next one highlighted — floats over it.
// ⚠️ No M-Pesa here: this sits beside invoicing copy (WEBSITE-PLAN.md §5).
//
// Callout size: viewBox 500 wide, 13-unit text. Shown with labels only at
// ≥ 505px (see frame.tsx), so text renders at ≥ 13.1px.

const LABEL =
  "A schedule plate with monthly send dates along a rail, a reminder card, and a stack of invoice sheets with the next one highlighted"

const TX = 179
const TY = 80
const FONT = 13

// Plate (flat units).
const PW = 290
const PH = 150
const PT = 10

// Rail along the back edge.
const RAIL_Y = 28
const NODES = [120, 165, 210, 255]
const NODE = 22
const NODE_T = 4
const NEXT = 2

// Invoice sheets.
const SW = 110
const SH = 78
const ST = 3
const SX = 22
const SY = 62
const SGAP = 17
const SR = 6

// Reminder card.
const CW = 82
const CH = 56
const CT = 4
const CX = 200
const CY = 80

/** Screen point of flat (x, y) on a surface lifted `lift` screen units above the plate. */
function at(x: number, y: number, lift = 0) {
  return isoPoint(x - lift, y - lift, TX, TY)
}

function Sheet({ index }: { index: number }) {
  const lift = ST + index * SGAP
  const brand = index === 2
  return (
    <IsoSlab x={SX - lift} y={SY - lift} w={SW} h={SH} t={ST} r={SR} tone={brand ? "brand" : "base"}>
      {brand ? (
        <g>
          <UiAvatar cx={16} cy={16} r={6} tone="brand" />
          <UiLines x={28} y={11} widths={[36, 22]} size={3} pitch={8} tone="brand" />
          <UiPill x={78} y={10} w={24} h={10} tone="brand" />
          <UiLines x={10} y={36} widths={[64, 50, 58]} size={3} pitch={9} tone="brand" />
          <UiLines x={88} y={36} widths={[12, 12, 12]} size={3} pitch={9} tone="brand" />
          <UiButton x={10} y={62} w={32} h={9} tone="brand" />
        </g>
      ) : (
        <g>
          <UiLines x={10} y={11} widths={[40, 26]} size={3} pitch={8} />
          <UiLines x={10} y={36} widths={[70, 56, 64]} size={3} pitch={9} />
        </g>
      )}
    </IsoSlab>
  )
}

function Art() {
  // Built on first scroll-in (IsoStep → app.css): the plate (step 0), the
  // send dates one by one (2–5), then the sheets and reminder (6–9).
  return (
    <>
      <IsoStep step={0} x={TX} y={TY}>
        {/* Schedule plate */}
        <IsoSlab w={PW} h={PH} t={PT} r={10}>
          {/* Rail: solid through the sent dates, dashed into the future */}
          <line x1={NODES[0] - 22} y1={RAIL_Y} x2={NODES[NEXT]} y2={RAIL_Y} className="stroke-line-strong" {...STROKE} />
          <line
            x1={NODES[NEXT]}
            y1={RAIL_Y}
            x2={PW - 20}
            y2={RAIL_Y}
            className="stroke-line-strong"
            strokeDasharray="3 4"
            {...STROKE}
          />
          {/* Reminder hangs off the last date */}
          <line
            x1={NODES[3]}
            y1={RAIL_Y + NODE / 2}
            x2={NODES[3]}
            y2={CY}
            className="stroke-line-strong"
            strokeDasharray="3 4"
            {...STROKE}
          />
          <UiLines x={18} y={PH - 16} widths={[60]} size={3} />
        </IsoSlab>
      </IsoStep>

      {/* Monthly send dates */}
      {NODES.map((cx, i) => (
        <IsoStep key={cx} step={2 + i} x={TX} y={TY}>
          <IsoSlab
            x={cx - NODE / 2 - NODE_T}
            y={RAIL_Y - NODE / 2 - NODE_T}
            w={NODE}
            h={NODE}
            t={NODE_T}
            r={4}
          >
            {i < NEXT ? (
              <path d="M6,11.5 L9.5,15 L16,8" fill="none" className="stroke-ink-muted" {...STROKE} />
            ) : i === NEXT ? (
              <circle cx={NODE / 2} cy={NODE / 2} r={4} className="fill-ink-subtle" />
            ) : null}
          </IsoSlab>
        </IsoStep>
      ))}

      {/* Bottom sheet sits on the plate, behind the reminder card */}
      <IsoStep step={6} x={TX} y={TY}>
        <Sheet index={0} />
      </IsoStep>

      {/* Reminder card */}
      <IsoStep step={7} x={TX} y={TY}>
        <IsoSlab x={CX - CT} y={CY - CT} w={CW} h={CH} t={CT} r={5}>
          <circle cx={18} cy={18} r={9} className="fill-canvas stroke-line-strong" {...STROKE} />
          <path d="M18,12.5 V18 L22,20.5" fill="none" className="stroke-line-strong" {...STROKE} />
          <UiLines x={34} y={12} widths={[34, 22]} size={3} pitch={8} />
          <UiLines x={10} y={37} widths={[60, 42]} size={3} pitch={8} />
        </IsoSlab>
      </IsoStep>

      <IsoStep step={8} x={TX} y={TY}>
        <Sheet index={1} />
      </IsoStep>
      <IsoStep step={9} x={TX} y={TY}>
        <Sheet index={2} />
      </IsoStep>
    </>
  )
}

function Callouts() {
  const k = cornerInset(SR)
  const topLift = ST + 2 * SGAP
  const [ix, iy] = at(SX + k, SY + k, topLift)
  const nk = cornerInset(4)
  const [nx, ny] = at(NODES[NEXT] + NODE / 2 - nk, RAIL_Y - NODE / 2 + nk, NODE_T)
  const ck = cornerInset(5)
  const [cx, cy] = at(CX + CW - ck, CY + ck, CT)
  return (
    <>
      <g {...revealStep(9)}>
        <Callout x={ix} y={iy} label="Recurring" dx={-20} dy={-26} run={12} fontSize={FONT} tone="brand" />
      </g>
      <g {...revealStep(2 + NEXT)}>
        <Callout x={nx} y={ny} label="Next send" dx={22} dy={-34} run={12} fontSize={FONT} />
      </g>
      <g {...revealStep(7)}>
        <Callout x={cx} y={cy} label="Reminder" dx={22} dy={40} run={10} fontSize={FONT} />
      </g>
    </>
  )
}

export function RecurringInvoices({
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
      compactViewBox="38 72 404 246"
      art={<Art />}
      callouts={<Callouts />}
      legend={[{ label: "Recurring", brand: true }, { label: "Next send" }, { label: "Reminder" }]}
      labelsFrom={labelsFrom}
      className={className}
    />
  )
}
