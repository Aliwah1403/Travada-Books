import type { ReactNode } from "react"

import { cn } from "@travada-books/ui/lib/utils"

import { STROKE } from "~/components/illustrations/iso"
import { Iso, IsoSlab, UiLines, UiPill } from "~/components/illustrations/kit"

// I8 — small spot illustrations, one per persona on /who-its-for
// (WEBSITE-REDO-PLAN.md §3). Same kit and rules as the large
// illustrations — iso line art, one brand layer each — but no callouts,
// so there is no in-SVG text to keep above 12px at small sizes.
//
// Every spot shares one 200 × 126 viewBox so they sit on a common
// baseline when shown side by side.

const VIEWBOX = "0 12 200 126"

function Spot({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <svg viewBox={VIEWBOX} role="img" aria-label={label} className={cn("h-auto w-full", className)}>
      {children}
    </svg>
  )
}

type SpotProps = { className?: string }

/* Freelancer — an invoice with a reminder clock resting on it. */
export function FreelancerSpot({ className }: SpotProps) {
  return (
    <Spot label="An invoice with a reminder clock resting on it" className={className}>
      <Iso x={107} y={28}>
        <IsoSlab w={78} h={96} t={5} r={6}>
          <UiLines x={10} y={12} widths={[30, 20]} size={4} pitch={9} />
          <UiLines x={10} y={40} widths={[56, 48, 52]} size={3} pitch={9} />
          <line x1={10} y1={74} x2={68} y2={74} className="stroke-line-strong" {...STROKE} />
          <UiLines x={44} y={80} widths={[24]} size={4} />
        </IsoSlab>
        {/* Reminder, raised on the invoice's front corner */}
        <IsoSlab x={42} y={58} w={34} h={34} t={10} r={17} tone="brand">
          <circle cx={17} cy={17} r={10} className="fill-none stroke-brand-line" {...STROKE} />
          <polyline points="17,10 17,17 22,20" fill="none" className="stroke-brand-line" {...STROKE} />
        </IsoSlab>
      </Iso>
    </Spot>
  )
}

/* Consultant — a calendar with the same date pinned every month. */
export function ConsultantSpot({ className }: SpotProps) {
  const cols = 4
  const rows = 3
  const cell = 20
  const top = 18
  return (
    <Spot label="A calendar with the same date pinned in every month" className={className}>
      <Iso x={100} y={26}>
        <IsoSlab w={92} h={92} t={6} r={6}>
          <line x1={0} y1={top - 4} x2={92} y2={top - 4} className="stroke-line-strong" {...STROKE} />
          <UiLines x={8} y={5} widths={[26]} size={4} />
          {Array.from({ length: rows * cols }, (_, i) => {
            const col = i % cols
            const row = Math.floor(i / cols)
            return (
              <rect
                key={i}
                x={6 + col * cell + col}
                y={top + row * (cell + 4) + 2}
                width={cell - 2}
                height={cell}
                rx={2}
                className="fill-canvas stroke-line"
                {...STROKE}
              />
            )
          })}
        </IsoSlab>
        {/* The pinned date — same column, every row */}
        {Array.from({ length: rows }, (_, row) => {
          const x = 6 + 2 * cell + 2 + 2
          const y = top + row * (cell + 4) + 2 + 3
          return <IsoSlab key={row} x={x - 7} y={y - 7} w={12} h={12} t={7} r={3} tone="brand" />
        })}
      </Iso>
    </Spot>
  )
}

/* Small business — a dashboard plate with bars rising off it. */
export function SmallBusinessSpot({ className }: SpotProps) {
  const bars = [
    { x: 12, y: 44, t: 16 },
    { x: 30, y: 34, t: 26 },
    { x: 48, y: 24, t: 20 },
    { x: 66, y: 14, t: 38, brand: true },
  ]
  return (
    <Spot label="A dashboard plate with a bar chart rising off it" className={className}>
      <Iso x={86} y={36}>
        <IsoSlab w={92} h={72} t={6} r={6}>
          <UiLines x={10} y={58} widths={[36]} size={3} />
        </IsoSlab>
        {/* Back to front, each bar resting on the plate */}
        {[...bars]
          .sort((a, b) => a.x + a.y - (b.x + b.y))
          .map((bar) => (
            <IsoSlab
              key={bar.x}
              x={bar.x - bar.t}
              y={bar.y - bar.t}
              w={14}
              h={14}
              t={bar.t}
              r={2}
              tone={bar.brand ? "brand" : "base"}
            />
          ))}
      </Iso>
    </Spot>
  )
}

/* Agency — a row of quotes, the accepted one raised and ticked. */
export function AgencySpot({ className }: SpotProps) {
  const cards = [0, 1, 2]
  return (
    <Spot label="A row of three quotes, with the accepted one raised and ticked" className={className}>
      <Iso x={62} y={28}>
        {cards.map((i) => {
          const accepted = i === 1
          const lift = accepted ? 14 : 3
          const x = i * 46
          return (
            <IsoSlab
              key={i}
              x={x - lift}
              y={-lift}
              w={40}
              h={56}
              t={accepted ? 5 : 3}
              r={5}
              tone={accepted ? "brand" : "base"}
            >
              <UiLines x={7} y={8} widths={[18, 12]} size={3} pitch={7} tone={accepted ? "brand" : "base"} />
              <UiLines x={7} y={28} widths={[28, 22]} size={3} pitch={7} tone={accepted ? "brand" : "base"} />
              {accepted ? (
                <polyline
                  points="24,46 28,50 35,42"
                  fill="none"
                  className="stroke-brand-line"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <UiPill x={20} y={44} w={16} h={7} />
              )}
            </IsoSlab>
          )
        })}
      </Iso>
    </Spot>
  )
}

/* Anyone with a backlog — a pile of statements, the top one sorted. */
export function BacklogSpot({ className }: SpotProps) {
  const sheets = 5
  const gap = 7
  return (
    <Spot label="A pile of statements, with the top one sorted into categories" className={className}>
      <Iso x={91} y={50}>
        {Array.from({ length: sheets }, (_, i) => {
          const top = i === sheets - 1
          const lift = i * gap
          return (
            <IsoSlab key={i} x={-lift} y={-lift} w={84} h={64} t={3} r={5} tone={top ? "brand" : "base"}>
              {top
                ? [0, 1, 2].map((row) => (
                    <g key={row}>
                      <UiLines x={9} y={12 + row * 16} widths={[30 - row * 6]} size={3} tone="brand" />
                      <UiPill x={50} y={9 + row * 16} w={24} h={9} tone="brand" />
                    </g>
                  ))
                : null}
            </IsoSlab>
          )
        })}
      </Iso>
    </Spot>
  )
}
