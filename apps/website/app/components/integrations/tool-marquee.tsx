import { useEffect, useRef } from "react"

import { FileSpreadsheetIcon, Pdf01Icon, type Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { INTEGRATIONS } from "~/data/integrations"

// /integrations hero visual: four rows of tool tiles drifting slowly in
// alternating directions, on a slightly tilted, dotted plane that fades
// out at its edges, with the Travada logo held still in the middle.
//
// Resting state is tipped well back (rotateX 20° under an 800px
// perspective) so the rows read as a floor. Hover (fine pointers only):
// the plane eases up flat over 1s — a slow,
// deliberate morph on a marketing hero, so longer than UI timings; the
// global reduced-motion rule collapses it.
//
// Motion: a CSS keyframe marquee (off the main thread), `transform` only,
// linear because it's constant motion. Each row's track holds the tiles
// twice, so translating it by -50% loops seamlessly. The rows start paused
// and only run while the plane is on screen; under reduced motion they
// don't move at all (keyframes + play-state rules live in app.css).

type Tile = { key: string; name: string; Icon?: Icon; src?: string; glyph?: boolean; soon?: boolean }

const TOOLS: Tile[] = INTEGRATIONS.map((i) => ({
  key: i.id,
  name: i.name,
  Icon: i.Icon,
  glyph: i.glyph,
  soon: i.status === "coming-soon",
}))

// Statement formats — what a bank or M-Pesa statement arrives as.
const FORMATS: Tile[] = [
  { key: "pdf", name: "PDF statements", Icon: Pdf01Icon, glyph: true },
  { key: "csv", name: "CSV statements", Icon: FileSpreadsheetIcon, glyph: true },
]

// Tools Curtis plans to integrate over the coming weeks, drawn from local
// logo files in public/logos/ (same set Midday's app store ships with).
// Not in data/integrations.ts yet — add them there, with a status, as they
// ship so the /integrations catalogue lists them too.
const PLANNED: Tile[] = [
  { key: "claude", name: "Claude", src: "/logos/claude.jpg" },
  { key: "chatgpt", name: "ChatGPT", src: "/logos/chatgpt.jpg" },
  { key: "gemini", name: "Gemini", src: "/logos/gemini.svg" },
  { key: "perplexity", name: "Perplexity", src: "/logos/perplexity.png" },
  { key: "dropbox", name: "Dropbox", src: "/logos/dropbox.svg" },
  { key: "google-drive", name: "Google Drive", src: "/logos/google-drive.svg" },
  { key: "slack", name: "Slack", src: "/logos/slack.svg" },
  { key: "telegram", name: "Telegram", src: "/logos/telegram.svg" },
  { key: "zapier", name: "Zapier", src: "/logos/zapier.svg" },
  { key: "make", name: "Make", src: "/logos/make.svg" },
  { key: "n8n", name: "n8n", src: "/logos/n8n.svg" },
  { key: "xero", name: "Xero", src: "/logos/xero.svg" },
  { key: "quickbooks", name: "QuickBooks", src: "/logos/quickbooks.svg" },
  { key: "cal", name: "Cal.com", src: "/logos/cal.svg" },
]

const byKey = new Map([...TOOLS, ...FORMATS, ...PLANNED].map((t) => [t.key, t]))
const pick = (keys: string[]) => keys.map((k) => byKey.get(k)).filter((t): t is Tile => Boolean(t))

// Four different orders so no column lines up across rows.
const ROWS: { tiles: Tile[]; duration: string; reverse?: boolean }[] = [
  { tiles: pick(["gmail", "claude", "bank-statements", "dropbox", "stripe", "slack", "pdf", "xero", "outlook", "zapier", "mpesa-statements", "gemini"]), duration: "80s" },
  { tiles: pick(["chatgpt", "outlook", "google-drive", "csv", "telegram", "mpesa", "quickbooks", "gmail", "make", "whatsapp", "perplexity", "cal"]), duration: "66s", reverse: true },
  { tiles: pick(["slack", "mpesa-statements", "n8n", "whatsapp", "claude", "gmail", "xero", "csv", "google-drive", "stripe", "chatgpt", "outlook"]), duration: "92s" },
  { tiles: pick(["zapier", "pdf", "gemini", "bank-statements", "dropbox", "telegram", "outlook", "quickbooks", "whatsapp", "perplexity", "gmail", "make"]), duration: "74s", reverse: true },
]

function ToolTile({ tile }: { tile: Tile }) {
  const { Icon } = tile
  return (
    <div
      className={cn(
        "flex size-12 shrink-0 items-center justify-center border border-line bg-panel shadow-xs sm:size-14",
        tile.soon && "opacity-50 grayscale",
      )}
    >
      {tile.src ? (
        <img src={tile.src} alt="" width={24} height={24} loading="lazy" decoding="async" className="size-6 object-contain" />
      ) : Icon ? (
        <Icon size={24} className={tile.glyph ? "size-6 text-ink-muted" : undefined} />
      ) : null}
    </div>
  )
}

function Row({ tiles, duration, reverse }: (typeof ROWS)[number]) {
  // Each half carries its own trailing gap (pr) so the two halves are
  // identical and -50% lands exactly on the start of the second one.
  const half = (hidden: boolean) => (
    <div className="flex shrink-0 gap-6 pr-6 sm:gap-8 sm:pr-8" aria-hidden={hidden || undefined}>
      {tiles.map((t) => (
        <ToolTile key={t.key} tile={t} />
      ))}
    </div>
  )
  return (
    <div className="overflow-hidden">
      <div
        className="tools-marquee flex w-max"
        style={{ animationDuration: duration, animationDirection: reverse ? "reverse" : "normal" }}
      >
        {half(false)}
        {half(true)}
      </div>
    </div>
  )
}

export function ToolMarquee({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  // Only drift while the plane is actually on screen.
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(([entry]) => {
      el.dataset.marqueeLive = entry.isIntersecting ? "true" : "false"
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={cn("relative perspective-[800px]", className)}>
      <p className="sr-only">
        Works with Gmail and Outlook, bank and M-Pesa statements as PDF or CSV. Stripe, WhatsApp and M-Pesa
        payments are coming soon.
      </p>
      <div
        aria-hidden="true"
        className="relative mx-auto max-w-3xl space-y-3 pb-1 sm:space-y-4 [transform:rotateX(20deg)_scaleY(0.9)] mask-radial-[50%_90%] mask-radial-from-70% transition-transform duration-1000 [transition-timing-function:var(--ease-in-out)] fine-hover:[transform:rotateX(0deg)_scaleY(1)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(var(--color-ink)_1px,transparent_1px)] bg-size-[16px_16px] opacity-25 mask-radial-to-55%" />
        {ROWS.map((row, i) => (
          <Row key={i} {...row} />
        ))}
        {/* Travada, held still at the centre of the moving rows. */}
        <div className="absolute inset-0 m-auto flex size-fit -translate-y-3.5">
          <div className="flex size-16 items-center justify-center border border-panel/20 bg-brand/80 shadow-xl ring-1 shadow-ink/20 ring-ink/50 backdrop-blur-lg sm:size-20">
            <img src="/logo.svg" alt="" width={32} height={32} className="size-8 brightness-0 invert" />
          </div>
        </div>
      </div>
    </div>
  )
}
