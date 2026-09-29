import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"

import { GmailIcon, LockPasswordIcon, OutlookIcon, Pdf01Icon, type Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { MockFrame, Pill } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// "Connect Gmail or Outlook" row: Gmail → Travada Books ← Outlook, two
// strokes on each side (one solid, one dotted, offset), on a scatter of
// dots. Brand-line pulses travel along each stroke toward Travada — the
// same `hub-pulse` as the home integrations hub (app.css), paused off
// screen via data-hub-live and removed under reduced motion.
//
// One coordinate system: the SVG (strokes, dots) and the HTML tiles are
// both laid out on a 560×240 box, tiles positioned in percentages of it.

const W = 560
const H = 240
const CY = 118
const RING = 88 // outer frame of a tile
const LEFT_X = 70
const HUB_X = W / 2
const RIGHT_X = W - LEFT_X
const LANE = 11 // half the gap between a side's two strokes

// Where the strokes start and end: the outer frames' facing edges.
const L1 = LEFT_X + RING / 2
const L2 = HUB_X - RING / 2
const R1 = HUB_X + RING / 2
const R2 = RIGHT_X - RING / 2

// Deterministic scatter for the dot field (no Math.random: prerendered).
const DOTS = Array.from({ length: 46 }, (_, i) => {
  const x = (i * 97 + 31) % W
  const y = (i * 53 + 17) % H
  const size = i % 5 === 0 ? 3 : 2
  return { x, y, size, faint: i % 3 === 0 }
}).filter(({ x, y }) => {
  // Keep the dots clear of the tiles.
  return ![LEFT_X, HUB_X, RIGHT_X].some((cx) => Math.abs(x - cx) < RING / 2 + 6 && Math.abs(y - CY) < RING / 2 + 6)
})

const pct = (value: number, of: number) => `${(value / of) * 100}%`

// A stroke split into a solid (gradient) run and a dotted run. `solidFirst`
// puts the solid part at the start of the path.
function Stroke({ x1, x2, y, split, solidFirst, gradient }: {
  x1: number
  x2: number
  y: number
  split: number
  solidFirst: boolean
  gradient: string
}) {
  const [solidA, solidB, dotA, dotB] = solidFirst ? [x1, split, split, x2] : [split, x2, x1, split]
  return (
    <>
      <line x1={solidA} y1={y} x2={solidB} y2={y} stroke={`url(#${gradient})`} strokeWidth={3} strokeLinecap="round" />
      <line
        x1={dotA}
        y1={y}
        x2={dotB}
        y2={y}
        className="stroke-line-strong"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="0.1 7"
      />
    </>
  )
}

// A pulse riding the stroke toward the hub (`from` → `to`).
function Pulse({ from, to, y, dur, delay }: { from: number; to: number; y: number; dur: number; delay: number }) {
  return (
    <path
      d={`M${from} ${y} L${to} ${y}`}
      pathLength={100}
      className="hub-pulse stroke-brand-line"
      strokeWidth={3}
      strokeLinecap="round"
      style={{ "--hub-dur": `${dur}s`, "--hub-delay": `${delay}s` } as CSSProperties}
    />
  )
}

function Tile({ x, label, step, children, brand = false }: {
  x: number
  label: string
  step: number
  children: ReactNode
  brand?: boolean
}) {
  return (
    <div
      {...revealStep(step)}
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: pct(x, W), top: pct(CY, H), width: pct(RING, W) }}
    >
      <div className="aspect-square w-full border border-line bg-panel/70 p-[7%] shadow-xs">
        <div
          className={cn(
            "flex size-full items-center justify-center border shadow-sm",
            brand ? "border-brand bg-brand shadow-ink/20" : "border-line bg-panel shadow-ink/5",
          )}
        >
          {children}
        </div>
      </div>
      <span className="absolute top-full mt-2 font-mono text-xs tracking-wide whitespace-nowrap text-ink-muted uppercase">
        {label}
      </span>
    </div>
  )
}

function BrandIcon({ icon: BrandMark }: { icon: Icon }) {
  return <BrandMark size={40} className="size-1/2" aria-hidden="true" />
}

export function ConnectInboxesMockup({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  // Pulses only run while the diagram is on screen.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.hubLive = "true"
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      el.dataset.hubLive = entry.isIntersecting ? "true" : "false"
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <MockFrame
      className={className}
      label="Illustration of Gmail on the left and Outlook on the right, each connected by two lines to Travada Books in the middle, with receipts flowing along the lines into Travada Books. Below: read-only access, PDF attachments only."
    >
      <div ref={ref} className="relative mx-auto aspect-[560/240] w-full max-w-xl">
        <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} fill="none" className="absolute inset-0 size-full">
          <defs>
            {/* Solid runs fade in toward Travada on both sides. User-space
                units: a bounding-box gradient on a horizontal line has a
                zero-height box and doesn't render. */}
            <linearGradient id="connect-in-left" gradientUnits="userSpaceOnUse" x1={L1} x2={L2} y1={0} y2={0}>
              <stop offset="0" style={{ stopColor: "var(--color-brand-line)", stopOpacity: 0.15 }} />
              <stop offset="1" style={{ stopColor: "var(--color-brand-line)" }} />
            </linearGradient>
            <linearGradient id="connect-in-right" gradientUnits="userSpaceOnUse" x1={R2} x2={R1} y1={0} y2={0}>
              <stop offset="0" style={{ stopColor: "var(--color-brand-line)", stopOpacity: 0.15 }} />
              <stop offset="1" style={{ stopColor: "var(--color-brand-line)" }} />
            </linearGradient>
          </defs>

          <g {...revealStep(0)}>
            {DOTS.map(({ x, y, size, faint }) => (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={size}
                height={size}
                className={faint ? "fill-line" : "fill-line-strong"}
              />
            ))}
          </g>

          {/* Gmail → Travada */}
          <g {...revealStep(2)}>
            <Stroke x1={L1} x2={L2} y={CY - LANE} split={L1 + (L2 - L1) * 0.62} solidFirst gradient="connect-in-left" />
            <Stroke x1={L1} x2={L2} y={CY + LANE} split={L1 + (L2 - L1) * 0.38} solidFirst={false} gradient="connect-in-left" />
            <Pulse from={L1} to={L2} y={CY - LANE} dur={4.6} delay={0.2} />
            <Pulse from={L1} to={L2} y={CY + LANE} dur={5.4} delay={1.9} />
          </g>

          {/* Outlook → Travada */}
          <g {...revealStep(4)}>
            <Stroke x1={R2} x2={R1} y={CY - LANE} split={R2 - (R2 - R1) * 0.62} solidFirst gradient="connect-in-right" />
            <Stroke x1={R2} x2={R1} y={CY + LANE} split={R2 - (R2 - R1) * 0.38} solidFirst={false} gradient="connect-in-right" />
            <Pulse from={R2} to={R1} y={CY - LANE} dur={5} delay={1.1} />
            <Pulse from={R2} to={R1} y={CY + LANE} dur={4.4} delay={2.6} />
          </g>
        </svg>

        <Tile x={LEFT_X} label="Gmail" step={1}>
          <BrandIcon icon={GmailIcon} />
        </Tile>
        <Tile x={HUB_X} label="Travada Books" step={3} brand>
          <img src="/logo.svg" alt="" width={40} height={40} className="size-2/5 brightness-0 invert" />
        </Tile>
        <Tile x={RIGHT_X} label="Outlook" step={5}>
          <BrandIcon icon={OutlookIcon} />
        </Tile>
      </div>

      <div {...revealStep(6)} className="mt-12 flex flex-wrap justify-center gap-2">
        <Pill label="Read-only access" icon={LockPasswordIcon} className="border border-line bg-panel text-ink-muted" />
        <Pill label="PDF attachments only" icon={Pdf01Icon} className="border border-line bg-panel text-ink-muted" />
      </div>
    </MockFrame>
  )
}
