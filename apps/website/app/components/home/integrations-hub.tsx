import { useEffect, useRef, type CSSProperties } from "react"

import {
  BankIcon,
  CreditCardIcon,
  FileSpreadsheetIcon,
  Link01Icon,
  Mail01Icon,
  MpesaIcon,
  Sent02Icon,
  Tag01Icon,
  type Icon,
} from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { LearnMore } from "~/components/home/shared"
import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"
import { SectionHeading } from "~/components/site/section-heading"
import { INTEGRATIONS, type IntegrationStatus } from "~/data/integrations"

/* -------------------------------------------------------------------------- */
/* 6b · Integrations hub                                                       */
/* -------------------------------------------------------------------------- */

const INTEGRATIONS_HUB_ID = "integrations"

// Status comes from data/integrations.ts so a tile loses its "Soon" tag the
// day the integration ships. Unknown ids read as coming soon, never as live.
function statusOf(id: string): IntegrationStatus {
  return INTEGRATIONS.find((integration) => integration.id === id)?.status ?? "coming-soon"
}

function iconOf(id: string): Icon {
  const integration = INTEGRATIONS.find((item) => item.id === id)
  if (!integration) throw new Error(`Unknown integration: ${id}`)
  return integration.Icon
}

type Tool = {
  /** Short name shown in the tile. */
  label: string
  /** Full accessible name. */
  name: string
  icon: Icon
  status: IntegrationStatus
  /** MpesaIcon is a wide raster wordmark, so it takes a smaller `size`. */
  iconSize?: number
  /** Monochrome Hugeicon rather than a brand mark. */
  glyph?: boolean
}

// Order matters: index 0–2 is the top row, 3–5 the bottom row.
// Statement import is live and isn't an "integration" in the data file.
const TOOLS: Tool[] = [
  { label: "Gmail", name: "Gmail", icon: iconOf("gmail"), status: statusOf("gmail") },
  { label: "Outlook", name: "Outlook", icon: iconOf("outlook"), status: statusOf("outlook") },
  { label: "Bank", name: "Bank statements, PDF or CSV", icon: BankIcon, status: "available", glyph: true },
  { label: "Mobile money", name: "Mobile money statements such as M-Pesa, PDF or CSV", icon: MpesaIcon, status: "available", iconSize: 30 },
  { label: "Stripe", name: "Stripe", icon: iconOf("stripe"), status: statusOf("stripe") },
  { label: "WhatsApp", name: "WhatsApp", icon: iconOf("whatsapp"), status: statusOf("whatsapp") },
]

type Action = { label: string; icon: Icon; status: IntegrationStatus }

// Live rows first; the two roadmap rows follow their integration's status.
// Keep the statement-import row away from the invoice row (voice rule 4).
const ACTIONS: Action[] = [
  { label: "Pull receipts from your inbox", icon: Mail01Icon, status: "available" },
  { label: "Import bank and mobile money statements", icon: FileSpreadsheetIcon, status: "available" },
  { label: "Match receipts to transactions", icon: Link01Icon, status: "available" },
  { label: "Categorise every transaction", icon: Tag01Icon, status: "available" },
  { label: "Send invoices on WhatsApp", icon: Sent02Icon, status: statusOf("whatsapp") },
  { label: "Take card payments", icon: CreditCardIcon, status: statusOf("stripe") },
]

/* ----------------------------- Diagram geometry --------------------------- */
// From lg the diagram is a fixed 896 × 320 px box (the frame's content width
// at 1024px, so it never has to scale), and the SVG's viewBox uses the same
// numbers. Every HTML element below is placed from these constants, so the
// paths meet tile, hub and row edges exactly at any lg+ width.

const W = 896
const H = 320
const LEFT_W = 240 // tile grid column
const RIGHT_X = 600 // action rows column starts here
const HEADING_H = 72 // column heading band above the 320px diagram

const TILE = 72
const TILE_GAP = 12
const GRID_TOP = (H - (TILE * 2 + TILE_GAP)) / 2 // 82
const GRID_BOTTOM = GRID_TOP + TILE * 2 + TILE_GAP // 238

const HUB = 88
const HUB_CX = (LEFT_W + RIGHT_X) / 2 // 420
const HUB_X = HUB_CX - HUB / 2 // 376
const HUB_Y = H / 2 - HUB / 2 // 116
const CENTRE_W = RIGHT_X - LEFT_W // 360

const ROW_H = 40
const ROW_GAP = 10
const ROWS_TOP = (H - (ACTIONS.length * ROW_H + (ACTIONS.length - 1) * ROW_GAP)) / 2 // 15

// Paths start/end a few px inside the (opaque) elements so no seam shows.
const TUCK = 6

function tilePath(index: number) {
  const col = index % 3
  const top = index < 3
  const dir = top ? -1 : 1 // up for the top row, down for the bottom row
  const cx = col * (TILE + TILE_GAP) + TILE / 2
  const edge = top ? GRID_TOP : GRID_BOTTOM
  // Each tile climbs to its own lane above (or below) the grid, runs clear
  // of the tiles to its right, then eases into the hub. Left tiles take the
  // outer lane and the outer entry point, so the three paths on each side
  // nest without crossing.
  const lane = edge + dir * [36, 24, 12][col]
  const entryY = H / 2 + dir * [32, 20, 8][col]
  const r = 8
  const runEnd = LEFT_W + 16
  const mid = (runEnd + HUB_X) / 2
  return [
    `M${cx} ${edge - dir * TUCK}`,
    `L${cx} ${lane - dir * r}`,
    `Q${cx} ${lane} ${cx + r} ${lane}`,
    `L${runEnd} ${lane}`,
    `C${mid} ${lane} ${mid} ${entryY} ${HUB_X + TUCK} ${entryY}`,
  ].join(" ")
}

function actionPath(index: number) {
  const n = ACTIONS.length
  const startY = H / 2 - 32 + (64 / (n - 1)) * index
  const endY = ROWS_TOP + index * (ROW_H + ROW_GAP) + ROW_H / 2
  const x1 = HUB_X + HUB - TUCK
  const x2 = RIGHT_X + TUCK
  const mid = (x1 + x2) / 2
  return `M${x1} ${startY} C${mid} ${startY} ${mid} ${endY} ${x2} ${endY}`
}

// Staggered so the pulses never march in step (durations include the idle
// tail of each trip — see `hub-pulse` in app.css).
const TILE_TIMING = [
  [4.8, 0.2],
  [5.6, 1.4],
  [4.2, 0.8],
  [5.2, 2.1],
  [4.6, 0],
  [5.8, 0],
]
const ACTION_TIMING = [
  [5.4, 1.1],
  [4.4, 2.4],
  [6, 0.5],
  [4.9, 1.8],
  [5, 0],
  [5, 0],
]

// The same constants, handed to Tailwind as CSS variables for the lg layout.
const GEOMETRY = {
  "--hub-w": `${W}px`,
  "--hub-h": `${H}px`,
  "--hub-head": `${HEADING_H}px`,
  "--hub-cols": `${LEFT_W}px ${CENTRE_W}px ${W - RIGHT_X}px`,
  "--hub-tile": `${TILE}px`,
  "--hub-tile-gap": `${TILE_GAP}px`,
  "--hub-grid-top": `${GRID_TOP}px`,
  "--hub-size": `${HUB}px`,
  "--hub-x": `${HUB_X - LEFT_W}px`,
  "--hub-y": `${HUB_Y}px`,
  "--hub-row-h": `${ROW_H}px`,
  "--hub-row-gap": `${ROW_GAP}px`,
} as CSSProperties

function pulseStyle([dur, delay]: number[]) {
  return { "--hub-dur": `${dur}s`, "--hub-delay": `${delay}s` } as CSSProperties
}

function Connector({ d, live, timing }: { d: string; live: boolean; timing: number[] }) {
  return (
    <>
      <path
        d={d}
        className="stroke-line-strong"
        strokeWidth={1}
        strokeDasharray={live ? undefined : "3 4"}
        vectorEffect="non-scaling-stroke"
      />
      {live ? (
        <path
          d={d}
          pathLength={100}
          className="hub-pulse stroke-brand-line"
          strokeWidth={1.5}
          strokeLinecap="round"
          style={pulseStyle(timing)}
        />
      ) : null}
    </>
  )
}

function SoonTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full border border-line bg-canvas px-1.5 font-mono text-xs tracking-wide text-ink-subtle uppercase",
        className,
      )}
    >
      Soon
    </span>
  )
}

function ColumnHeading({ title, subtitle, className }: { title: string; subtitle: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 text-center", className)}>
      <h3 className="text-lg font-medium tracking-tight text-ink">{title}</h3>
      <p className="text-sm text-ink-muted">{subtitle}</p>
    </div>
  )
}

// Vertical hairline between the stacked columns below lg.
function StackConnector() {
  return <div aria-hidden="true" className="mx-auto my-4 h-8 w-px bg-line-strong lg:hidden" />
}

function Diagram() {
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
    <div
      ref={ref}
      style={GEOMETRY}
      className="relative mx-auto mt-12 flex max-w-sm flex-col md:mt-16 lg:grid lg:w-(--hub-w) lg:max-w-none lg:grid-cols-(--hub-cols) lg:grid-rows-[var(--hub-head)_var(--hub-h)]"
    >
      {/* Connectors — lg+ only, same coordinate system as the HTML below. */}
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${W} ${H}`}
        fill="none"
        className="pointer-events-none absolute inset-x-0 top-(--hub-head) hidden h-(--hub-h) w-(--hub-w) lg:block"
      >
        {TOOLS.map((tool, i) => (
          <Connector key={tool.label} d={tilePath(i)} live={tool.status === "available"} timing={TILE_TIMING[i]} />
        ))}
        {ACTIONS.map((action, i) => (
          <Connector
            key={action.label}
            d={actionPath(i)}
            live={action.status === "available"}
            timing={ACTION_TIMING[i]}
          />
        ))}
      </svg>

      {/* Left — your tools */}
      <div className="contents">
        <ColumnHeading
          title="Your tools"
          subtitle="Connect what you already use"
          className="lg:col-start-1 lg:row-start-1"
        />
        <ul
          aria-label="Tools Travada Books works with"
          className="mx-auto mt-6 grid w-fit grid-cols-3 gap-(--hub-tile-gap) lg:col-start-1 lg:row-start-2 lg:mx-0 lg:mt-(--hub-grid-top) lg:self-start"
        >
          {TOOLS.map(({ label, name, icon: ToolIcon, status, iconSize, glyph }) => {
            const soon = status === "coming-soon"
            return (
              <li
                key={label}
                className={cn(
                  "relative flex size-(--hub-tile) flex-col items-center justify-center gap-1.5 border bg-panel",
                  soon ? "border-dashed border-line-strong" : "border-line shadow-xs",
                )}
              >
                <span className="sr-only">
                  {name}
                  {soon ? " (coming soon)" : null}
                </span>
                <span aria-hidden="true" className={cn("flex h-6 items-center", soon && "opacity-50 grayscale")}>
                  <ToolIcon size={iconSize ?? 24} className={glyph ? "size-6 text-brand" : undefined} />
                </span>
                <span aria-hidden="true" className={cn("text-center text-xs leading-tight", soon ? "text-ink-subtle" : "text-ink-muted")}>
                  {label}
                </span>
                {soon ? <SoonTag className="absolute -top-2.5 -right-2" /> : null}
              </li>
            )
          })}
        </ul>
      </div>

      <StackConnector />

      {/* Centre — the hub */}
      <div className="contents">
        <ColumnHeading
          title="Travada Books"
          subtitle="Your books, in one place"
          className="lg:col-start-2 lg:row-start-1"
        />
        <div className="relative mt-6 flex justify-center lg:col-start-2 lg:row-start-2 lg:mt-0 lg:block">
          <div className="flex size-(--hub-size) items-center justify-center bg-brand shadow-lg lg:absolute lg:top-(--hub-y) lg:left-(--hub-x)">
            <img src="/logo.svg" alt="Travada Books" width={40} height={40} className="size-10 brightness-0 invert" />
          </div>
        </div>
      </div>

      <StackConnector />

      {/* Right — what happens next */}
      <div className="contents">
        <ColumnHeading
          title="What happens next"
          subtitle="Handled for you"
          className="lg:col-start-3 lg:row-start-1"
        />
        <ul className="mt-6 flex flex-col gap-(--hub-row-gap) lg:col-start-3 lg:row-start-2 lg:mt-0 lg:justify-center">
          {ACTIONS.map(({ label, icon: ActionIcon, status }) => {
            const soon = status === "coming-soon"
            return (
              <li
                key={label}
                className={cn(
                  "flex h-(--hub-row-h) items-center gap-2.5 border bg-panel px-3 text-sm",
                  soon ? "border-dashed border-line-strong text-ink-muted" : "border-line text-ink shadow-xs",
                )}
              >
                <ActionIcon
                  className={cn("size-4 shrink-0", soon ? "text-ink-subtle" : "text-brand-line")}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {soon ? (
                  <>
                    <span className="sr-only">(coming soon)</span>
                    <SoonTag className="shrink-0" />
                  </>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export function IntegrationsHub() {
  return (
    <Section size="lg" id={INTEGRATIONS_HUB_ID} className="scroll-mt-16">
      <SectionHeading
        align="center"
        eyebrow={<Eyebrow>Integrations</Eyebrow>}
        title="Works with the tools you already use."
        lede="Connect Gmail or Outlook and upload your bank and mobile money statements, such as M-Pesa. Travada Books pulls in the receipts, matches them and categorises the transactions, so the records stay in one place."
      />

      <Diagram />

      <div className="mt-12 flex justify-center md:mt-16">
        <LearnMore to="/integrations">See all integrations</LearnMore>
      </div>
    </Section>
  )
}
