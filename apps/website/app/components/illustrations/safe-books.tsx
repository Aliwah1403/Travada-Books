import { STROKE, isoPoint, liftOffset } from "~/components/illustrations/iso"
import { Connector, Iso, IsoSlab, UiAvatar, UiLines, UiPill } from "~/components/illustrations/kit"

// I7 — home trust band (WEBSITE-REDO-PLAN.md §3), drawn for a dark
// surface with the kit's inverse tones. A safe sits on the organisation's
// plate beside its member cards (only members see the books), and a copy
// of the books lifts out of it (export any time). No text inside the SVG.

// Plate
const PW = 320
const PH = 260
// Safe box: footprint and height, standing on the plate at (BX, BY).
const BW = 150
const BH = 130
const BOX_T = 100
const BX = 60
const BY = 65
// Exported document, floating above the safe.
const DW = 80
const DH = 100
const DOC_LIFT = 170
const DX = 10
const DY = 20

const TX = 244
const TY = 167

export function SafeBooks({ className }: { className?: string }) {
  const [lx, ly] = liftOffset(BOX_T)
  const boxX = BX + lx
  const boxY = BY + ly
  const [ox, oy] = liftOffset(DOC_LIFT)
  const docX = DX + ox
  const docY = DY + oy

  // Connector: from the safe's top-face centre up to the document's front corner.
  const from = isoPoint(boxX + BW / 2, boxY + BH / 2, TX, TY)
  const to = isoPoint(docX + DW, docY + DH, TX, TY)

  return (
    <svg
      viewBox="0 0 540 480"
      role="img"
      aria-label="A safe on your organisation's plate beside its member cards, with a copy of the books lifting out of it"
      className={className ?? "h-auto w-full"}
    >
      <Iso x={TX} y={TY}>
        {/* The organisation's plate */}
        <IsoSlab w={PW} h={PH} t={10} r={10} tone="inverse">
          {/* Member cards — only these people see the books */}
          {[40, 94, 148].map((y, i) => (
            <IsoSlab key={y} x={226} y={y} w={80} h={40} t={4} r={5} tone="inverse">
              <UiAvatar cx={14} cy={20} r={7} tone="inverse" />
              <UiLines x={28} y={13} widths={[40 - i * 6, 28]} size={3} pitch={9} tone="inverse" />
            </IsoSlab>
          ))}
          {/* Faint footprint marks on the plate */}
          <UiLines x={18} y={214} widths={[90, 60]} size={3} pitch={10} tone="inverse" />
        </IsoSlab>

        {/* The safe (highlighted) */}
        <IsoSlab x={boxX} y={boxY} w={BW} h={BH} t={BOX_T} r={4} tone="inverseBrand">
          <UiPill x={BW / 2 - 22} y={BH / 2 - 6} w={44} h={12} tone="inverseBrand" />
        </IsoSlab>
        {/* Door on the safe's front-left face: (u, s) → flat (u + s, BH + s) */}
        <g transform={`matrix(1 0 1 1 ${boxX} ${boxY + BH})`}>
          <rect x={16} y={14} width={BW - 32} height={BOX_T - 28} rx={3} className="fill-none stroke-brand-soft/70" {...STROKE} />
          <circle cx={BW / 2} cy={BOX_T / 2} r={15} className="fill-none stroke-brand-soft/70" {...STROKE} />
          <circle cx={BW / 2} cy={BOX_T / 2} r={4} className="fill-brand-soft/70" />
          {[0, 90, 180, 270].map((angle) => {
            const rad = (angle * Math.PI) / 180
            const c = BW / 2
            const m = BOX_T / 2
            return (
              <line
                key={angle}
                x1={c + Math.cos(rad) * 15}
                y1={m + Math.sin(rad) * 15}
                x2={c + Math.cos(rad) * 21}
                y2={m + Math.sin(rad) * 21}
                className="stroke-brand-soft/70"
                {...STROKE}
              />
            )
          })}
          <line x1={BW - 28} y1={BOX_T / 2 - 12} x2={BW - 28} y2={BOX_T / 2 + 12} className="stroke-brand-soft/70" {...STROKE} />
        </g>
      </Iso>

      <Connector from={from} to={to} axis="vertical" dashed tone="inverse" endDot={false} />

      <Iso x={TX} y={TY}>
        {/* A copy of the books, lifting out — export any time */}
        <IsoSlab x={docX} y={docY} w={DW} h={DH} t={4} r={5} tone="inverse">
          <UiLines x={12} y={14} widths={[40, 28]} size={3} pitch={9} tone="inverse" />
          <UiLines x={12} y={44} widths={[56, 48, 56, 36]} size={3} pitch={10} tone="inverse" />
        </IsoSlab>
      </Iso>
    </svg>
  )
}
