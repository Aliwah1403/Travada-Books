import { cn } from "@travada-books/ui/lib/utils"

import { STROKE, isoPoint } from "~/components/illustrations/iso"
import { Callout, Iso, IsoSlab, UiLines, UiPill } from "~/components/illustrations/kit"

// 404 spot: a plate holding two pages — one present, and a dashed outline
// in the brand tone where the second should be. Same kit rules as the
// other illustrations.
//
// Callout size: viewBox 320 wide, 12-unit text, shown at `max-w-xs`
// (320px). The page gutter leaves ≥ 358px at a 390px viewport, so the
// text renders at 12px.

const TX = 150
const TY = 44

// Plate.
const PW = 190
const PH = 120
const PT = 10

// Cards on the plate (flat, plate-relative). Each card is lifted by its own
// thickness so it rests on the plate's top face.
const CW = 64
const CH = 88
const CT = 5
const PRESENT: [number, number] = [18, 16]
const MISSING: [number, number] = [106, 16]

export function MissingPage({ className }: { className?: string }) {
  const [mx, my] = MISSING
  const anchor = isoPoint(mx + CW / 2, my + CH / 2, TX, TY)

  return (
    <svg
      viewBox="0 0 320 220"
      role="img"
      aria-label="A plate with one page on it and a dashed outline where a second page is missing"
      className={cn("h-auto w-full", className)}
    >
      <Iso x={TX} y={TY}>
        <IsoSlab w={PW} h={PH} t={PT} r={8}>
          <IsoSlab x={PRESENT[0] - CT} y={PRESENT[1] - CT} w={CW} h={CH} t={CT} r={4}>
            <UiLines x={8} y={10} widths={[28, 18]} size={4} pitch={9} />
            <UiLines x={8} y={36} widths={[46, 40, 44, 30]} size={3} pitch={8} />
            <UiPill x={8} y={72} w={22} h={8} />
          </IsoSlab>
          {/* The missing page — outline only */}
          <rect
            x={mx}
            y={my}
            width={CW}
            height={CH}
            rx={4}
            strokeDasharray="4 4"
            className="fill-brand-soft/60 stroke-brand-line"
            {...STROKE}
          />
        </IsoSlab>
      </Iso>
      <Callout x={anchor[0]} y={anchor[1]} label="404" dx={36} dy={-58} run={14} tone="brand" />
    </svg>
  )
}
