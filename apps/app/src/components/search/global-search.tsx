import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  ArrowDown01Icon,
  ArrowTurnBackwardIcon,
  ArrowUp01Icon,
  DashboardSquare01Icon,
  FileEditIcon,
  GridIcon,
  InboxIcon,
  Invoice01Icon,
  PlusSignIcon,
  ReceiptTextIcon,
  Search01Icon,
  Settings02Icon,
  User02Icon,
  VaultIcon,
  Wallet01Icon,
  type Icon,
} from "@travada-books/ui/icons"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@travada-books/ui/components/command"
import { Tooltip, TooltipContent, TooltipTrigger } from "@travada-books/ui/components/tooltip"
import { useAuth } from "@/contexts/auth-context"
import { useFormatDate } from "@/hooks/use-format-date"
import { formatCurrency } from "@/lib/format"
import { globalSearch, type SearchResult, type SearchResultType } from "@/lib/queries/search"

const MIN_TERM_LENGTH = 2

const shortcutKey =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K"

const SHORTCUTS: { group: string; items: { label: string; to: string; icon: Icon }[] }[] = [
  {
    group: "Create",
    items: [
      { label: "New invoice", to: "/invoices/create", icon: PlusSignIcon },
      { label: "New quote", to: "/quotes/create", icon: PlusSignIcon },
    ],
  },
  {
    group: "Go to",
    items: [
      { label: "Dashboard", to: "/", icon: DashboardSquare01Icon },
      { label: "Invoices", to: "/invoices", icon: Invoice01Icon },
      { label: "Quotes", to: "/quotes", icon: FileEditIcon },
      { label: "Customers", to: "/customers", icon: User02Icon },
      { label: "Transactions", to: "/transactions", icon: Wallet01Icon },
      { label: "Vault", to: "/vault", icon: VaultIcon },
      { label: "Inbox", to: "/inbox", icon: InboxIcon },
      { label: "Bills", to: "/bills", icon: ReceiptTextIcon },
    ],
  },
  {
    group: "Settings",
    items: [
      { label: "General settings", to: "/settings/general", icon: Settings02Icon },
      { label: "Team", to: "/settings/team", icon: User02Icon },
      { label: "Integrations", to: "/settings/integrations", icon: GridIcon },
      { label: "Categories", to: "/settings/categories", icon: Settings02Icon },
      { label: "Your profile", to: "/account/profile", icon: User02Icon },
    ],
  },
]

const RESULT_GROUPS: { type: SearchResultType; heading: string; icon: Icon }[] = [
  { type: "customer", heading: "Customers", icon: User02Icon },
  { type: "invoice", heading: "Invoices", icon: Invoice01Icon },
  { type: "quote", heading: "Quotes", icon: FileEditIcon },
  { type: "transaction", heading: "Transactions", icon: Wallet01Icon },
  { type: "document", heading: "Vault", icon: VaultIcon },
  { type: "inbox", heading: "Inbox", icon: InboxIcon },
  { type: "bill", heading: "Bills", icon: ReceiptTextIcon },
  { type: "statement", heading: "Statements", icon: FileEditIcon },
]

// Records without a page of their own open their panel through ?open=<id> (the
// list page reads it). Inbox selects by ?inboxId and only keeps an id that is in
// the visible list, so the search narrows the list to the item as well.
function resultPath(result: SearchResult): string {
  switch (result.type) {
    case "customer":
      return `/customers/${result.id}`
    case "invoice":
      return `/invoices/${result.id}`
    case "quote":
      return `/quotes/${result.id}`
    case "statement":
      return `/statements/${result.id}`
    case "transaction":
      return `/transactions?open=${result.id}`
    case "document":
      return `/vault?open=${result.id}`
    case "bill":
      return `/bills?open=${result.id}`
    case "inbox":
      return `/inbox?${new URLSearchParams({ q: result.title ?? "", inboxId: result.id })}`
  }
}

function formatAmount(amount: number | null, currency: string | null): string | null {
  if (amount == null || !currency) return null
  try {
    return formatCurrency(amount, currency)
  } catch {
    return `${currency} ${amount}`
  }
}

function useDebouncedTerm(term: string): string {
  const [debounced, setDebounced] = useState(term)
  useEffect(() => {
    // Longer searches are still being typed: wait a little more, like Midday.
    const delay = term.trim().includes(" ") ? 350 : 200
    const timer = setTimeout(() => setDebounced(term), delay)
    return () => clearTimeout(timer)
  }, [term])
  return debounced
}

function ResultRow({
  result,
  icon: ResultIcon,
  onSelect,
}: {
  result: SearchResult
  icon: Icon
  onSelect: () => void
}) {
  const { formatDate } = useFormatDate()
  const amount = formatAmount(result.amount, result.currency)
  const status = result.status?.replace(/_/g, " ")

  return (
    <CommandItem value={`${result.type}-${result.id}`} onSelect={onSelect}>
      <ResultIcon size={14} className="shrink-0 text-muted-foreground" />
      <span className="max-w-[55%] shrink-0 truncate">{result.title ?? "Untitled"}</span>
      {result.subtitle && (
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{result.subtitle}</span>
      )}
      {/* The slot hides CommandItem's built-in tick on rows like this one. */}
      <span
        data-slot="command-shortcut"
        className="ml-auto flex shrink-0 items-center gap-3 pl-3 text-[11px] text-muted-foreground tabular-nums"
      >
        {status && <span className="capitalize">{status}</span>}
        {result.type === "transaction" && result.date && <span>{formatDate(result.date)}</span>}
        {amount && <span className="text-foreground">{amount}</span>}
      </span>
    </CommandItem>
  )
}

function SearchContent({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { orgId } = useAuth()
  const [term, setTerm] = useState("")
  const debounced = useDebouncedTerm(term).trim()
  const canSearch = Boolean(orgId) && debounced.length >= MIN_TERM_LENGTH

  const { data, isFetching, isError } = useQuery({
    queryKey: ["global-search", orgId, debounced],
    queryFn: () => globalSearch(orgId!, debounced),
    enabled: canSearch,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: 1,
  })
  const results = useMemo(() => {
    if (!canSearch || !data) return []
    return RESULT_GROUPS.flatMap(({ type }) =>
      data.filter((result) => result.type === type).sort((a, b) => b.rank - a.rank),
    )
  }, [canSearch, data])

  const shortcuts = useMemo(() => {
    const needle = term.trim().toLowerCase()
    return SHORTCUTS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(needle)),
    })).filter((group) => group.items.length > 0)
  }, [term])

  function go(to: string) {
    onClose()
    navigate(to)
  }

  const hasTerm = term.trim().length > 0

  // With filtering off, cmdk keeps its highlight on whatever row it was on, so
  // Enter could open a shortcut while better results sit above it. Move it to
  // the top row whenever the top row changes, and leave arrow-key moves alone.
  const firstResult = hasTerm ? results[0] : undefined
  const firstValue = firstResult
    ? `${firstResult.type}-${firstResult.id}`
    : shortcuts[0]
      ? `shortcut-${shortcuts[0].items[0].to}`
      : ""
  const [selected, setSelected] = useState(firstValue)
  useEffect(() => setSelected(firstValue), [firstValue])

  const shortcutGroups = shortcuts.map((group) => (
    <CommandGroup key={group.group} heading={group.group}>
      {group.items.map((item) => (
        <CommandItem key={item.to} value={`shortcut-${item.to}`} onSelect={() => go(item.to)}>
          <item.icon size={14} className="shrink-0 text-muted-foreground" />
          <span>{item.label}</span>
        </CommandItem>
      ))}
    </CommandGroup>
  ))

  return (
    <Command
      shouldFilter={false}
      value={selected}
      onValueChange={setSelected}
      className="rounded-none bg-popover"
    >
      <CommandInput value={term} onValueChange={setTerm} placeholder="Find anything..." autoFocus />
      <CommandList className="h-80 max-h-80">
        {isError && canSearch && (
          <p className="px-3 py-2 text-xs text-destructive">
            Search isn't available right now. Please try again.
          </p>
        )}

        {!hasTerm && shortcutGroups}

        {RESULT_GROUPS.map(({ type, heading, icon }) => {
          const rows = results.filter((result) => result.type === type)
          if (rows.length === 0) return null
          return (
            <CommandGroup key={type} heading={heading}>
              {rows.map((result) => (
                <ResultRow
                  key={result.id}
                  result={result}
                  icon={icon}
                  onSelect={() => go(resultPath(result))}
                />
              ))}
            </CommandGroup>
          )
        })}

        {hasTerm && shortcutGroups}

        {isFetching && results.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
        )}

        {hasTerm && !isFetching && !isError && results.length === 0 && shortcuts.length === 0 && (
          <CommandEmpty>
            {term.trim().length < MIN_TERM_LENGTH
              ? "Keep typing to search."
              : `No results for "${term.trim()}".`}
          </CommandEmpty>
        )}
      </CommandList>

      <div className="flex h-9 shrink-0 items-center justify-end gap-1 border-t px-2 text-muted-foreground">
        {[ArrowUp01Icon, ArrowDown01Icon, ArrowTurnBackwardIcon].map((KeyIcon, i) => (
          <span key={i} className="flex size-5 items-center justify-center rounded-sm border bg-muted">
            <KeyIcon size={12} />
          </span>
        ))}
      </div>
    </Command>
  )
}

export function GlobalSearch({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label="Search"
                onClick={() => setOpen(true)}
                className="flex h-9 w-full items-center justify-center rounded-md text-muted-foreground transition-[colors,transform] fine-hover:bg-muted fine-hover:text-foreground active:scale-[0.97]"
              />
            }
          >
            <Search01Icon size={16} className="shrink-0" />
          </TooltipTrigger>
          <TooltipContent side="right">Search {shortcutKey}</TooltipContent>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-8 w-full items-center gap-2 rounded-md border bg-muted/40 px-2.5 text-xs text-muted-foreground transition-[colors,transform] fine-hover:bg-muted fine-hover:text-foreground active:scale-[0.97]"
        >
          <Search01Icon size={14} className="shrink-0" />
          <span className="flex-1 truncate text-left">Find anything...</span>
          <kbd className="pointer-events-none shrink-0 rounded-sm border bg-background px-1 font-sans text-[10px]">
            {shortcutKey}
          </kbd>
        </button>
      )}

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search customers, invoices, quotes, transactions, documents and more."
        className="top-[15%] sm:max-w-2xl"
      >
        {open && <SearchContent onClose={() => setOpen(false)} />}
      </CommandDialog>
    </>
  )
}
