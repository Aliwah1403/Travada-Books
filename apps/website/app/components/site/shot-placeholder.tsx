import { cn } from "@travada-books/ui/lib/utils"

type ShotPlaceholderProps = {
  /** What the real screenshot will show — rendered as the caption. */
  label: string
  /** CSS aspect-ratio, e.g. "16/10". */
  ratio?: string
  className?: string
}

// Stand-in for a product screenshot (WEBSITE-REDO-PLAN.md §0): a framed
// hatched box with a mono caption saying what will go here.
export function ShotPlaceholder({ label, ratio = "16/10", className }: ShotPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={`Screenshot placeholder: ${label}`}
      className={cn("rounded-xl border border-line bg-panel p-1.5", className)}
    >
      <div
        style={{ aspectRatio: ratio }}
        className="flex w-full items-center justify-center rounded-lg border border-line bg-canvas bg-[repeating-linear-gradient(135deg,var(--color-line)_0_1px,transparent_1px_12px)] p-6"
      >
        <span className="max-w-sm rounded-md border border-line bg-panel px-3 py-1.5 text-center font-mono text-xs tracking-wide text-ink-muted uppercase">
          {label}
        </span>
      </div>
    </div>
  )
}
