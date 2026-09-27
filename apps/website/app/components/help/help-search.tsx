import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { useNavigate } from "react-router"

import { ArrowRight01Icon, Cancel01Icon, Search01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import type { HelpArticle } from "~/data/help"
import { buildSearchIndex, searchArticles } from "~/lib/help-search"

const MAX_RESULTS = 8

// "Soon" marker for planned articles — in search results and category lists.
export function SoonPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-line bg-canvas px-2 py-0.5 font-mono text-xs tracking-wide text-ink-subtle uppercase",
        className,
      )}
    >
      Soon
    </span>
  )
}

type HelpSearchProps = {
  articles: HelpArticle[]
  /** Category id → display title, for the result eyebrow and for matching. */
  categoryTitles: Record<string, string>
  /** Chips under the field that fill the search. */
  popularSearches: string[]
  contactEmail: string
}

// Accessible combobox (input + listbox, aria-activedescendant). Everything
// keyboard-driven is instant — no transitions on the highlight, the list
// or its scrolling (CLAUDE.md "What never gets animated"). Without JS the
// field simply does nothing; the categories below stay fully browsable.
export function HelpSearch({ articles, categoryTitles, popularSearches, contactEmail }: HelpSearchProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const id = useId()
  const listboxId = `${id}-listbox`
  const optionId = (index: number) => `${id}-option-${index}`

  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const index = useMemo(
    () => buildSearchIndex(articles, (article) => categoryTitles[article.category] ?? ""),
    [articles, categoryTitles],
  )
  const results = useMemo(() => searchArticles(index, query).slice(0, MAX_RESULTS), [index, query])

  const trimmed = query.trim()
  const hasQuery = trimmed.length > 0
  const showList = open && hasQuery && results.length > 0
  const showEmpty = open && hasQuery && results.length === 0
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0))

  // Keep the highlighted option visible inside the list. Adjusts the list's
  // own scrollTop rather than calling scrollIntoView, which could scroll the
  // page (html has smooth scrolling) and animate a keyboard action.
  useEffect(() => {
    const list = listRef.current
    const option = list?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    if (!list || !option) return
    if (option.offsetTop < list.scrollTop) {
      list.scrollTop = option.offsetTop
    } else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight
    }
  }, [activeIndex, showList])

  function updateQuery(value: string) {
    setQuery(value)
    setActive(0)
    setOpen(true)
  }

  function openArticle(article: HelpArticle | undefined) {
    if (!article?.written) return
    navigate(`/guides/${article.slug}`)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        if (!hasQuery || results.length === 0) return
        event.preventDefault()
        setOpen(true)
        setActive(showList ? (activeIndex + 1) % results.length : 0)
        break
      case "ArrowUp":
        if (!hasQuery || results.length === 0) return
        event.preventDefault()
        setOpen(true)
        setActive(showList ? (activeIndex - 1 + results.length) % results.length : results.length - 1)
        break
      case "Enter":
        event.preventDefault()
        if (showList) openArticle(results[activeIndex])
        break
      case "Escape":
        if (!query) return
        event.preventDefault()
        updateQuery("")
        break
    }
  }

  return (
    <div role="search" className="w-full">
      <label htmlFor={`${id}-input`} className="sr-only">
        Search the help centre
      </label>
      <div className="relative">
        <div className="flex h-14 items-center gap-3 border border-line-strong bg-panel px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-line md:h-16 md:px-5">
          <Search01Icon className="size-5 shrink-0 text-ink-subtle" aria-hidden="true" />
          <input
            ref={inputRef}
            id={`${id}-input`}
            type="text"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={showList ? optionId(activeIndex) : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="search"
            enterKeyHint="search"
            // COPY: needs Curtis's approval
            placeholder="Search for help, like “recurring invoice”"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={handleKeyDown}
            className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-subtle md:text-lg"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                updateQuery("")
                inputRef.current?.focus()
              }}
              className="-mr-2 flex size-9 shrink-0 items-center justify-center text-ink-subtle transition-colors active:opacity-80 fine-hover:text-ink"
            >
              <Cancel01Icon className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <p role="status" className="sr-only">
          {hasQuery ? (results.length === 0 ? "No articles found" : `${results.length} ${results.length === 1 ? "article" : "articles"} found`) : ""}
        </p>

        {/* Clicks inside the popup mustn't blur the input first. */}
        <div
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "absolute inset-x-0 top-full z-30 mt-2 border border-line-strong bg-panel text-left shadow-lg",
            !(showList || showEmpty) && "hidden",
          )}
        >
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Help articles"
            className={cn("relative max-h-[min(26rem,55vh)] overflow-y-auto", !showList && "hidden")}
          >
            {results.map((article, index) => {
              const isActive = showList && index === activeIndex
              return (
                <li
                  key={article.slug}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isActive}
                  aria-disabled={!article.written || undefined}
                  data-index={index}
                  onMouseMove={() => setActive(index)}
                  onClick={() => openArticle(article)}
                  className={cn(
                    "flex items-start gap-4 border-b border-line px-4 py-3 last:border-b-0 md:px-5",
                    article.written ? "cursor-pointer" : "cursor-default",
                    isActive && "bg-canvas",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs tracking-wide text-ink-subtle uppercase">
                      {categoryTitles[article.category]}
                    </p>
                    <p className={cn("mt-1 text-base font-medium", article.written ? "text-ink" : "text-ink-muted")}>
                      {article.title}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-ink-muted">{article.summary}</p>
                  </div>
                  {article.written ? (
                    <ArrowRight01Icon
                      aria-hidden="true"
                      className={cn("mt-6 size-4 shrink-0", isActive ? "text-ink" : "text-ink-subtle")}
                    />
                  ) : (
                    <SoonPill className="mt-5" />
                  )}
                </li>
              )
            })}
          </ul>
          {showList ? (
            <p
              aria-hidden="true"
              className="hidden border-t border-line bg-canvas px-5 py-2 font-mono text-xs tracking-wide text-ink-subtle uppercase sm:block"
            >
              ↑↓ to move · Enter to open · Esc to clear
            </p>
          ) : null}

          {showEmpty ? (
            // COPY: needs Curtis's approval
            <div className="px-5 py-6">
              <p className="text-base font-medium text-ink">No articles match &ldquo;{trimmed}&rdquo;.</p>
              <p className="mt-1 text-sm text-pretty text-ink-muted">
                Try another word, or email{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-brand underline decoration-brand/30 underline-offset-4 transition-colors active:opacity-80 fine-hover:text-brand-line"
                >
                  {contactEmail}
                </a>{" "}
                and a person will help.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="mr-1 text-sm text-ink-subtle">Popular:</span>
        {popularSearches.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => {
              updateQuery(term)
              inputRef.current?.focus()
            }}
            className="rounded-full border border-line bg-panel px-3 py-1 text-sm text-ink-muted transition-colors active:opacity-80 fine-hover:border-line-strong fine-hover:text-ink"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  )
}
