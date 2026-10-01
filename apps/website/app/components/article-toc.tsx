import { useEffect, useState, type RefObject } from "react"

import { cn } from "@travada-books/ui/lib/utils"

type TocEntry = { id: string; label: string }

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

/**
 * Sticky "On this page" rail for long-form guide articles.
 *
 * Content lives in MDX with no heading metadata in frontmatter, so the TOC
 * is derived at runtime from the rendered `<h2>`s inside `containerRef`
 * rather than hand-maintained — headings get an `id` assigned here if MDX
 * didn't already give them one, which is also what makes the `href="#id"`
 * links (and the browser's native smooth-scroll, already global via
 * `html { scroll-behavior: smooth }` in app.css) work.
 *
 * Desktop-only (`lg:` and up) so it never crowds the single-column reading
 * view on phones/tablets, and renders nothing for zero or one heading — a
 * one-entry "list" has no navigational value.
 */
export function ArticleToc({
  containerRef,
}: {
  containerRef: RefObject<HTMLElement | null>
}) {
  const [entries, setEntries] = useState<TocEntry[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const headings = Array.from(container.querySelectorAll<HTMLHeadingElement>("h2"))
    if (headings.length < 2) {
      setEntries([])
      return
    }

    const seen = new Map<string, number>()
    const nextEntries = headings.map((heading) => {
      const base = slugify(heading.textContent ?? "") || "section"
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)
      const id = count === 0 ? base : `${base}-${count}`
      heading.id = id
      heading.classList.add("scroll-mt-24")
      return { id, label: heading.textContent ?? "" }
    })
    setEntries(nextEntries)
    setActiveId(nextEntries[0]?.id ?? null)

    const observer = new IntersectionObserver(
      (observerEntries) => {
        for (const observerEntry of observerEntries) {
          if (observerEntry.isIntersecting) {
            setActiveId(observerEntry.target.id)
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    )
    headings.forEach((heading) => observer.observe(heading))
    return () => observer.disconnect()
  }, [containerRef])

  if (entries.length < 2) return null

  return (
    <aside className="hidden lg:block">
      <nav aria-label="On this page" className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto">
        <p className="font-mono text-xs tracking-wide text-ink-subtle uppercase">On this page</p>
        <ol className="mt-4 border-l border-line">
          {entries.map((entry, index) => {
            const isActive = entry.id === activeId
            return (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "-ml-px flex gap-3 border-l py-1.5 pl-4 text-sm text-pretty transition-colors active:opacity-80",
                    isActive
                      ? "border-brand-line text-ink"
                      : "border-transparent text-ink-muted fine-hover:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "mt-px font-mono text-xs tabular-nums",
                      isActive ? "text-brand-line" : "text-ink-subtle",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {entry.label}
                </a>
              </li>
            )
          })}
        </ol>
      </nav>
    </aside>
  )
}
