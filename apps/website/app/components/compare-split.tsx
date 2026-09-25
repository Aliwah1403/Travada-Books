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

  return (
    <div className={cn("mt-10 grid gap-6 sm:grid-cols-2", className)}>
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
        "rounded-[.9rem] border p-6",
        tone === "old"
          ? "border-[var(--website-line)] bg-[color-mix(in_oklab,var(--website-ink)_4%,transparent)]"
          : "border-[color-mix(in_oklab,var(--website-green)_35%,transparent)] bg-[color-mix(in_oklab,var(--website-green)_6%,transparent)]",
      )}
    >
      <p className="font-sans text-[.62rem] font-semibold uppercase leading-none tracking-[.11em] text-[color-mix(in_oklab,var(--website-ink)_55%,transparent)]">
        {label}
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 font-heading text-[.92rem] leading-relaxed text-[color-mix(in_oklab,var(--website-ink)_78%,transparent)]"
          >
            <Icon
              aria-hidden="true"
              size={18}
              className={cn(
                "mt-[.15rem] shrink-0",
                tone === "old"
                  ? "text-[color-mix(in_oklab,var(--website-ink)_40%,transparent)]"
                  : "text-[var(--website-green)]",
              )}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
