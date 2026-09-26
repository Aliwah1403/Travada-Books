import { CancelCircleIcon, CheckmarkCircle02Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

export type CompareSplitProps = {
  /** Column label for the "old way" side. Defaults to "Spreadsheet". */
  oldLabel?: string
  /** Column label for the "new way" side. Defaults to "Bookkeeping software". */
  newLabel?: string
  oldItems?: string[]
  newItems?: string[]
  className?: string
}

/**
 * Scannable "old way / new way" split for `compare/*.mdx` content —
 * adapted from shadcnblocks' `compare10`, minus the competitor-logo-grid
 * framing (we have nothing honest to grid against). Content owns the rows:
 * `oldItems`/`newItems` are supplied per-article from `~/content/compare/*.mdx`,
 * not hard-coded here.
 *
 * Exposed to MDX via `mdxComponents.CompareSplit` — an article can render
 * `<CompareSplit oldItems={[...]} newItems={[...]} />` directly in its body.
 * A comparison article isn't required to use it (the compare collection's
 * one current article also keeps its full criterion-by-criterion table for
 * the exhaustive/SEO-parseable version); if neither list is supplied this
 * renders nothing rather than an empty shell.
 *
 * Rendered as two `<ul>`s, not a `<table>`: nothing here is actually
 * tabular (rows aren't paired 1:1 across the two sides), so a real table
 * would misrepresent the structure to assistive tech. The X/check icons
 * are `aria-hidden` — each column's own label plus its item text is what
 * conveys "old way" vs "new way", never colour or icon shape alone.
 */
export function CompareSplit({
  oldLabel = "Spreadsheet",
  newLabel = "Bookkeeping software",
  oldItems = [],
  newItems = [],
  className,
}: CompareSplitProps) {
  if (oldItems.length === 0 && newItems.length === 0) return null

  // One hairline frame split down the middle (stacked on phones), like the
  // site's Split rows. The internal hairline is drawn by the second column.
  return (
    <div className={cn("mt-8 grid border border-line sm:grid-cols-2", className)}>
      <CompareColumn label={oldLabel} items={oldItems} tone="old" />
      <CompareColumn label={newLabel} items={newItems} tone="new" />
    </div>
  )
}

function CompareColumn({
  label,
  items,
  tone,
}: {
  label: string
  items: string[]
  tone: "old" | "new"
}) {
  if (items.length === 0) return null

  const Icon = tone === "old" ? CancelCircleIcon : CheckmarkCircle02Icon

  return (
    <div
      className={cn(
        "flex flex-col",
        tone === "old" ? "bg-canvas" : "border-t border-line bg-panel sm:border-t-0 sm:border-l",
      )}
    >
      <p
        className={cn(
          "border-b border-line px-5 py-3 font-mono text-xs tracking-wide uppercase",
          tone === "old" ? "text-ink-subtle" : "text-brand",
        )}
      >
        {label}
      </p>
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 px-5 py-3.5 text-base text-pretty text-ink-muted">
            <Icon
              aria-hidden="true"
              className={cn("mt-1 size-4 shrink-0", tone === "old" ? "text-ink-subtle" : "text-brand-line")}
            />
            <span className={tone === "new" ? "text-ink" : undefined}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
