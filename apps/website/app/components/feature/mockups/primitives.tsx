import { useEffect, useRef, type ReactNode } from "react"

import {
  Alert01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  ClockCheckIcon,
  FileEditIcon,
  PieChartIcon,
  Sent02Icon,
  TickIcon,
  type Icon,
} from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { revealStep } from "~/components/feature/mockups/reveal"

// Shared pieces for coded product mockups (Midday-style live HTML
// recreations of app UI). Illustrative only: every mockup is one
// `role="img"` with a plain-language label, nothing inside is focusable
// or pretends to be clickable. Text never goes below text-xs (12px) and
// mockups are never shrunk with transforms.

// ── Status pill ─────────────────────────────────────────────────────────

export type MockStatus = "draft" | "scheduled" | "sent" | "partial" | "paid" | "overdue"

// Labels, icons and colours mirror apps/app invoice-status-badge.tsx
// ("unpaid" shows as "Sent" there; "partially_paid" as "Part-paid").
const STATUS: Record<MockStatus, { label: string; icon: Icon; className: string }> = {
  draft: { label: "Draft", icon: FileEditIcon, className: "bg-status-draft-soft text-status-draft" },
  scheduled: {
    label: "Scheduled",
    icon: ClockCheckIcon,
    className: "bg-status-scheduled-soft text-status-scheduled",
  },
  sent: { label: "Sent", icon: Sent02Icon, className: "bg-status-sent-soft text-status-sent" },
  partial: { label: "Part-paid", icon: PieChartIcon, className: "bg-status-partial-soft text-status-partial" },
  paid: { label: "Paid", icon: CheckmarkCircle01Icon, className: "bg-status-paid-soft text-status-paid" },
  overdue: { label: "Overdue", icon: Alert01Icon, className: "bg-status-overdue-soft text-status-overdue" },
}

export function StatusPill({ status, className }: { status: MockStatus; className?: string }) {
  const { label, icon, className: tone } = STATUS[status]
  return <Pill label={label} icon={icon} className={cn(tone, className)} />
}

export type MockQuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired"

// apps/app quote-status-badge.tsx, on the same status tokens: accepted is
// the paid green, declined the overdue red, expired the part-paid amber.
const QUOTE_STATUS: Record<MockQuoteStatus, { label: string; icon: Icon; className: string }> = {
  draft: STATUS.draft,
  sent: STATUS.sent,
  accepted: { label: "Accepted", icon: CheckmarkCircle01Icon, className: "bg-status-paid-soft text-status-paid" },
  declined: { label: "Declined", icon: Cancel01Icon, className: "bg-status-overdue-soft text-status-overdue" },
  expired: { label: "Expired", icon: Clock01Icon, className: "bg-status-partial-soft text-status-partial" },
}

export function QuoteStatusPill({ status, className }: { status: MockQuoteStatus; className?: string }) {
  const { label, icon, className: tone } = QUOTE_STATUS[status]
  return <Pill label={label} icon={icon} className={cn(tone, className)} />
}

/** Icon + label pill on a soft status fill. */
export function Pill({
  label,
  icon: PillIcon,
  className,
}: {
  label: string
  icon: Icon
  /** Fill + text colour, e.g. "bg-status-paid-soft text-status-paid". */
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full py-0.5 pr-2 pl-1.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      <PillIcon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}

// ── Reveal ──────────────────────────────────────────────────────────────

// One-time staggered entrance (CSS in app.css). Only armed after hydration,
// only for a mockup that starts below the fold, never under reduced motion,
// so the prerendered HTML is always fully visible.
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (el.getBoundingClientRect().top < window.innerHeight) return
    el.dataset.reveal = "pending"
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        el.dataset.reveal = "shown"
        observer.disconnect()
      },
      { rootMargin: "0px 0px -15% 0px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

// ── Frame ───────────────────────────────────────────────────────────────

type MockFrameProps = {
  /** What the mockup shows, read out instead of its contents. */
  label: string
  children: ReactNode
  className?: string
}

// ── Controls (static look-alikes) ───────────────────────────────────────

/** A button's look, not a button: nothing in a mockup is interactive. */
export function MockButton({
  children,
  variant = "outline",
  className,
}: {
  children: ReactNode
  variant?: "primary" | "outline" | "ghost" | "destructive"
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 px-3 text-xs font-medium whitespace-nowrap",
        variant === "primary" && "bg-brand text-panel",
        variant === "outline" && "border border-line bg-panel text-ink",
        variant === "ghost" && "text-ink-muted",
        variant === "destructive" && "bg-status-overdue-soft text-status-overdue",
        className,
      )}
    >
      {children}
    </span>
  )
}

/** A form field's look: value (or muted placeholder) in a bordered box,
 *  optional leading addon and select chevron. */
export function MockField({
  children,
  addon,
  select = false,
  muted = false,
  className,
}: {
  children: ReactNode
  addon?: ReactNode
  select?: boolean
  muted?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex h-9 items-center border border-line bg-panel text-xs", className)}>
      {addon ? <span className="flex h-full items-center border-r border-line px-2.5 font-medium">{addon}</span> : null}
      <span className={cn("min-w-0 flex-1 truncate px-2.5", muted ? "text-ink-subtle" : "text-ink")}>{children}</span>
      {select ? <ArrowDown01Icon className="mr-2 size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" /> : null}
    </div>
  )
}

/** Square checkbox look. */
export function MockCheckbox({ checked = false }: { checked?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center border",
        checked ? "border-brand bg-brand text-panel" : "border-line-strong bg-panel",
      )}
    >
      {checked ? <TickIcon className="size-3" /> : null}
    </span>
  )
}

/** On/off switch look (square track, like the rest of the site). */
export function MockSwitch({ on = false }: { on?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex h-5 w-9 shrink-0 items-center p-0.5", on ? "justify-end bg-brand" : "justify-start bg-line-strong")}
    >
      <span className="size-4 bg-panel" />
    </span>
  )
}

/** The small round colour marker the app puts beside a category name. */
export function CategoryDot({ className }: { className: string }) {
  return <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", className)} />
}

/** A tinted notice strip, like the app's banners on quote and invoice pages. */
export function MockNotice({
  tone,
  children,
  className,
}: {
  tone: "paid" | "overdue" | "partial"
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "border px-3 py-2.5 text-xs",
        tone === "paid" && "border-status-paid/25 bg-status-paid-soft text-status-paid",
        tone === "overdue" && "border-status-overdue/25 bg-status-overdue-soft text-status-overdue",
        tone === "partial" && "border-status-partial/25 bg-status-partial-soft text-status-partial",
        className,
      )}
    >
      {children}
    </div>
  )
}

// Same chrome as ShotPlaceholder (panel border + inset canvas well), so
// coded mockups and screenshot placeholders read as one family. The well
// is a size container: mockups adapt to the column, not the viewport.
export function MockFrame({ label, children, className }: MockFrameProps) {
  const ref = useReveal()
  return (
    <div ref={ref} role="img" aria-label={label} className={cn("border border-line bg-panel p-1.5", className)}>
      <div className="@container border border-line bg-canvas p-3 select-none sm:p-5 md:p-3 lg:p-5">{children}</div>
    </div>
  )
}

/** A window of app UI inside the frame: panel, hairline border, soft shadow. */
export function MockPanel({
  children,
  className,
  step = 0,
}: {
  children: ReactNode
  className?: string
  /** Order in the staggered entrance. */
  step?: number
}) {
  return (
    <div
      {...revealStep(step)}
      className={cn("border border-line bg-panel text-ink shadow-sm shadow-ink/5", className)}
    >
      {children}
    </div>
  )
}

/** Header strip of a MockPanel: title left, optional detail right. */
export function MockPanelHeader({ title, aside }: { title: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
      <p className="text-sm font-medium">{title}</p>
      {aside ? <div className="flex items-center gap-2 text-xs text-ink-muted">{aside}</div> : null}
    </div>
  )
}

/** Muted field label, like the app's form labels. */
export function MockLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs text-ink-muted", className)}>{children}</p>
}

/** Square initials avatar — the app's customer avatar fallback. */
export function MockAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  return (
    <span
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center border border-line bg-canvas font-mono text-xs text-ink-muted",
        className,
      )}
    >
      {initials}
    </span>
  )
}

// ── Stat card ───────────────────────────────────────────────────────────

type StatCardProps = {
  label: string
  /** The big figure, e.g. "KES 412,500" or "16 days to pay". */
  value: string
  detail: string
  /** Colour of the small square marker beside the label. */
  tone?: "sent" | "overdue" | "paid"
  /** Extra content under the detail line (e.g. a meter). */
  children?: ReactNode
  className?: string
  step?: number
}

const TONE_DOT = {
  sent: "bg-status-sent",
  overdue: "bg-status-overdue",
  paid: "bg-status-paid",
}

// The app's invoice stat card (apps/app invoice-stats.tsx): figure, label,
// invoice count.
export function StatCard({ label, value, detail, tone, children, className, step }: StatCardProps) {
  return (
    <MockPanel step={step} className={cn("flex flex-col p-3 @sm:p-4", className)}>
      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
        {tone ? <span className={cn("size-1.5 shrink-0", TONE_DOT[tone])} aria-hidden="true" /> : null}
        {label}
      </p>
      <p className="mt-2 text-base font-semibold tracking-tight text-balance tabular-nums @sm:text-lg">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{detail}</p>
      {children}
    </MockPanel>
  )
}

// ── Floating fragments (hero layout "floating") ────────────────────────

/** A short story told in 2–3 small cards of real UI, cascading from top
 *  left to bottom right and overlapping a little. One `role="img"`. */
export function MockFragments({
  label,
  children,
  className,
}: {
  /** The whole story in plain language, read instead of the cards. */
  label: string
  children: ReactNode
  className?: string
}) {
  const ref = useReveal()
  return (
    <div ref={ref} role="img" aria-label={label} className={cn("mx-auto flex max-w-4xl flex-col select-none", className)}>
      {children}
    </div>
  )
}

const FRAGMENT_ALIGN = {
  start: "self-start",
  center: "self-center",
  end: "self-end",
}

/** One card in MockFragments. Later cards overlap the one before. */
export function MockFragment({
  align = "start",
  step = 0,
  children,
  className,
}: {
  align?: keyof typeof FRAGMENT_ALIGN
  /** Order in the staggered entrance — and in the story. */
  step?: number
  children: ReactNode
  className?: string
}) {
  return (
    <div
      {...revealStep(step)}
      className={cn(
        "@container relative w-full border border-line bg-panel text-ink shadow-xl shadow-ink/10 sm:w-[78%] md:w-[60%]",
        step > 0 && "-mt-2",
        FRAGMENT_ALIGN[align],
        className,
      )}
      style={{ ...revealStep(step).style, zIndex: step + 1 }}
    >
      {children}
    </div>
  )
}

// ── Phone ───────────────────────────────────────────────────────────────

/** A plain, square phone: a thick panel bezel with a speaker slot, and a
 *  screen at a real phone's CSS width, so text stays at app size. */
export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("w-[20rem] max-w-full border border-line-strong bg-panel p-2.5 shadow-2xl shadow-ink/15", className)}>
      <div aria-hidden="true" className="mx-auto mb-2.5 h-1.5 w-14 bg-line" />
      <div className="@container overflow-hidden border border-line bg-panel text-ink">{children}</div>
    </div>
  )
}
