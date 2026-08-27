import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import { toast } from "sonner"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Tabs, TabsList, TabsTrigger } from "@travada-books/ui/components/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu"
import {
  Search01Icon,
  Cancel01Icon,
  Upload01Icon,
  SortingIcon,
  TickIcon,
  InboxIcon,
} from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { useRealtime, useDebouncedCallback } from "@/hooks/use-realtime"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { FileDropzone } from "@/components/shared/file-dropzone"
import { InboxItemCard } from "@/components/inbox/inbox-item-card"
import { InboxDetails } from "@/components/inbox/inbox-details"
import { InboxListSkeleton } from "@/components/inbox/inbox-skeletons"
import { InboxGetStarted } from "@/components/inbox/inbox-get-started"
import { BulkActionBar } from "@/components/inbox/bulk-action-bar"
import {
  listInboxItems,
  createInboxItem,
  deleteInboxItem,
  bulkDeleteInboxItems,
  updateInboxStatus,
  retryMatching,
  addBlocklistEntry,
  getInboxEmail,
  type InboxItem,
  type InboxItemStatus,
  type InboxFilters,
  type InboxOrder,
} from "@/lib/queries/inbox"

const ORDER_LABEL: Record<InboxOrder, string> = {
  recent: "Most recent",
  oldest: "Oldest",
  alphabetical: "Alphabetical",
  document_date: "Document date",
}

const ORDER_OPTIONS: InboxOrder[] = ["recent", "oldest", "alphabetical", "document_date"]

const PENDING_STATUSES: InboxItemStatus[] = ["new", "processing", "analyzing"]
const PAGE_SIZE = 30

function isAcceptedFile(file: File): boolean {
  const isImage = file.type.startsWith("image/") || file.type === ""
  const isPdf = file.type === "application/pdf"
  return isImage || isPdf
}

export function InboxView() {
  const { orgId, org } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const inboxId = searchParams.get("inboxId")
  const tab = (searchParams.get("tab") === "other" ? "other" : "all") as "all" | "other"
  const status = (searchParams.get("status") as InboxItemStatus | null) ?? undefined
  const order = (ORDER_OPTIONS.includes(searchParams.get("order") as InboxOrder)
    ? (searchParams.get("order") as InboxOrder)
    : "recent")
  const qParam = searchParams.get("q") ?? ""

  const [searchInput, setSearchInput] = useState(qParam)
  const [page, setPage] = useState(0)

  // Reset to page 0 whenever the active filter set changes (adjusted during
  // render, not in an effect, per React's "adjusting state on prop change" pattern).
  const filterKey = `${tab}|${status ?? ""}|${order}|${qParam}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setPage(0)
    setSelectedIds(new Set())
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function updateParams(patch: Record<string, string | null>, replace = true) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value === null) params.delete(key)
          else params.set(key, value)
        }
        return params
      },
      { replace },
    )
  }

  // Debounce search input -> URL `q` param (page reset happens via the
  // filterKey render-time check above once qParam updates).
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput === qParam) return
      updateParams({ q: searchInput || null })
    }, 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const filters: InboxFilters = useMemo(
    () => ({ tab, status, q: qParam || undefined }),
    [tab, status, qParam],
  )

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["inbox", orgId, filters, page, order],
    queryFn: () => listInboxItems(orgId!, filters, page, order),
    enabled: !!orgId,
    placeholderData: (prev) => prev,
    refetchInterval: (query) => {
      const d = query.state.data as { data: InboxItem[] } | undefined
      const hasPending = d?.data.some((i) => PENDING_STATUSES.includes(i.status))
      return hasPending ? 4000 : false
    },
  })

  // Items arrive via server-side email ingestion that no client mutation
  // knows about, so the list needs its own realtime backstop. Debounced so a
  // burst of forwarded emails doesn't fire a refetch per row. The empty state
  // (below) flips to the list automatically once the refetch resolves, since
  // `items` is derived from the query data.
  const debouncedInvalidateInbox = useDebouncedCallback(
    (payload: RealtimePostgresChangesPayload<{ id?: string }>) => {
      queryClient.invalidateQueries({ queryKey: ["inbox", orgId] })
      if (payload.eventType === "UPDATE") {
        const updatedId = payload.new?.id
        if (updatedId) queryClient.invalidateQueries({ queryKey: ["inbox-item", updatedId] })
      }
    },
    1000,
  )
  useRealtime({
    channelName: "inbox-items",
    table: "inbox_items",
    events: ["INSERT", "UPDATE"],
    filter: orgId ? `org_id=eq.${orgId}` : undefined,
    onEvent: debouncedInvalidateInbox,
  })

  const items = data?.data ?? []
  const totalCount = data?.count ?? 0
  const isFiltered = !!qParam || !!status || tab === "other"

  // Auto-select first item when none selected, or reselect if the current
  // selection fell out of the (filtered) list.
  useEffect(() => {
    if (isLoading || items.length === 0) return
    if (!inboxId || !items.some((i) => i.id === inboxId)) {
      updateParams({ inboxId: items[0].id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, inboxId, isLoading])

  // Keyboard nav — up/down scrolls the selection into view. Never animated
  // (keyboard-triggered actions are excluded from the animation system).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tagName = (document.activeElement?.tagName ?? "").toLowerCase()
      if (tagName === "input" || tagName === "textarea" || tagName === "select") return
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
      if (items.length === 0) return
      e.preventDefault()
      const currentIndex = items.findIndex((i) => i.id === inboxId)
      const delta = e.key === "ArrowDown" ? 1 : -1
      const base = currentIndex === -1 ? 0 : currentIndex
      const nextIndex = Math.min(items.length - 1, Math.max(0, base + delta))
      const next = items[nextIndex]
      if (!next) return
      updateParams({ inboxId: next.id })
      itemRefs.current.get(next.id)?.scrollIntoView({ block: "nearest" })
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, inboxId])

  const selectedItem = items.find((i) => i.id === inboxId) ?? null

  const uploadMutation = useMutation({
    mutationFn: (file: File) => createInboxItem(orgId!, file),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["inbox", orgId] })
      updateParams({ inboxId: item.id })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InboxItemStatus }) =>
      updateInboxStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox", orgId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, filePath }: { id: string; filePath: string }) =>
      deleteInboxItem(id, filePath),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inbox", orgId] })
      if (inboxId === variables.id) updateParams({ inboxId: null })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (selectedItems: InboxItem[]) => bulkDeleteInboxItems(selectedItems),
    onSuccess: (_data, selectedItems) => {
      queryClient.invalidateQueries({ queryKey: ["inbox", orgId] })
      if (selectedItems.some((i) => i.id === inboxId)) updateParams({ inboxId: null })
      clearSelection()
    },
  })

  const retryMutation = useMutation({
    mutationFn: (id: string) => retryMatching(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["inbox", orgId] })
      queryClient.invalidateQueries({ queryKey: ["inbox-item", id] })
    },
  })

  const blocklistMutation = useMutation({
    mutationFn: ({ type, value }: { type: "email" | "domain"; value: string }) =>
      addBlocklistEntry(orgId!, type, value),
  })

  function handleDropFiles(files: File[]) {
    for (const file of files) {
      if (!isAcceptedFile(file)) {
        toast.error(`"${file.name}" is not supported. Upload an image or PDF.`)
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 10 MB limit.`)
        continue
      }
      toast.promise(uploadMutation.mutateAsync(file), {
        loading: `Uploading ${file.name}…`,
        success: `${file.name} uploaded`,
        error: `Failed to upload ${file.name}`,
      })
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length) handleDropFiles(files)
  }

  function handleMarkDone(item: InboxItem) {
    toast.promise(statusMutation.mutateAsync({ id: item.id, status: "done" }), {
      loading: "Marking done…",
      success: "Marked as done",
      error: "Failed to update status",
    })
  }

  function handleMarkUnhandled(item: InboxItem) {
    toast.promise(statusMutation.mutateAsync({ id: item.id, status: "pending" }), {
      loading: "Marking unhandled…",
      success: "Marked as unhandled",
      error: "Failed to update status",
    })
  }

  function handleDelete(item: InboxItem) {
    toast.promise(deleteMutation.mutateAsync({ id: item.id, filePath: item.file_path }), {
      loading: "Deleting…",
      success: "Item deleted",
      error: "Failed to delete item",
    })
  }

  function handleBulkDelete() {
    const selectedItems = items.filter((i) => selectedIds.has(i.id))
    toast.promise(bulkDeleteMutation.mutateAsync(selectedItems), {
      loading: `Deleting ${selectedItems.length} item${selectedItems.length !== 1 ? "s" : ""}…`,
      success: "Items deleted",
      error: "Failed to delete items",
    })
  }

  function handleRetryMatching(item: InboxItem) {
    toast.promise(retryMutation.mutateAsync(item.id), {
      loading: "Retrying…",
      success: "Retrying — this may take a moment",
      error: "Failed to retry matching",
    })
  }

  function handleBlockEmail(item: InboxItem) {
    if (!item.sender_email) return
    toast.promise(blocklistMutation.mutateAsync({ type: "email", value: item.sender_email }), {
      loading: "Blocking sender…",
      success: "Sender blocked",
      error: "Failed to block sender",
    })
  }

  function handleBlockDomain(item: InboxItem) {
    const domain = item.sender_email?.split("@")[1]
    if (!domain) return
    toast.promise(blocklistMutation.mutateAsync({ type: "domain", value: domain }), {
      loading: "Blocking domain…",
      success: "Domain blocked",
      error: "Failed to block domain",
    })
  }

  const inboxEmail = getInboxEmail(org)
  const showEmptyState = !isLoading && !isError && items.length === 0 && !isFiltered

  if (isError && items.length === 0) {
    return (
      <div className="flex h-full flex-col p-6">
        <ErrorState onRetry={refetch} />
      </div>
    )
  }

  return (
    <FileDropzone onDropFiles={handleDropFiles} className="flex h-full min-h-0 flex-1 flex-col">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.heic,.heif"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Inbox</h1>
          <p className="text-xs text-muted-foreground">
            Receipts and invoices, auto-matched to your transactions
          </p>
        </div>
        <Button
          className="h-9 gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          <Upload01Icon size={14} />
          Upload
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b px-6 py-3">
        <Tabs
          value={tab}
          onValueChange={(value) => updateParams({ tab: value === "other" ? "other" : null })}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search01Icon
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search inbox…"
            className={cn("h-8 w-56 pl-8 text-xs", searchInput ? "pr-8" : "pr-3")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors fine-hover:text-foreground"
            >
              <Cancel01Icon size={12} />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="ml-auto flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium text-muted-foreground transition-colors fine-hover:text-foreground focus-visible:outline-none" />
            }
          >
            <SortingIcon size={13} />
            {ORDER_LABEL[order]}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ORDER_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt}
                onClick={() => updateParams({ order: opt === "recent" ? null : opt })}
                className="gap-2"
              >
                {opt === order && <TickIcon size={12} className="shrink-0" />}
                <span className={opt === order ? "" : "pl-[18px]"}>{ORDER_LABEL[opt]}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Two-pane body */}
      {showEmptyState ? (
        <InboxGetStarted inboxEmail={inboxEmail} />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: scrollable list */}
          <div className="flex w-80 shrink-0 flex-col overflow-y-auto border-r">
            {isLoading ? (
              <InboxListSkeleton />
            ) : items.length === 0 ? (
              <EmptyState
                icon={InboxIcon}
                title="No items found"
                description={isFiltered ? "Try a different search or filter" : "Upload a receipt to get started"}
                compact
              />
            ) : (
              items.map((item) => (
                <InboxItemCard
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current.set(item.id, el)
                  }}
                  item={item}
                  selected={item.id === inboxId}
                  onSelect={() => updateParams({ inboxId: item.id })}
                  checked={selectedIds.has(item.id)}
                  onToggleCheck={toggleSelect}
                />
              ))
            )}

            {!isLoading && totalCount > PAGE_SIZE && (
              <div className="mt-auto flex items-center justify-between gap-2 border-t px-3 py-2 text-[11px] text-muted-foreground">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="transition-colors fine-hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  Prev
                </button>
                <span>
                  Page {page + 1} of {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
                </span>
                <button
                  onClick={() => setPage((p) => (p + 1) * PAGE_SIZE < totalCount ? p + 1 : p)}
                  disabled={(page + 1) * PAGE_SIZE >= totalCount}
                  className="transition-colors fine-hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Right: detail pane */}
          <InboxDetails
            item={selectedItem}
            isLoading={isLoading && items.length === 0}
            onMarkDone={handleMarkDone}
            onMarkUnhandled={handleMarkUnhandled}
            onDelete={handleDelete}
            onRetryMatching={handleRetryMatching}
            onBlockEmail={handleBlockEmail}
            onBlockDomain={handleBlockDomain}
            isMutating={
              statusMutation.isPending ||
              deleteMutation.isPending ||
              retryMutation.isPending ||
              blocklistMutation.isPending
            }
          />
        </div>
      )}

      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={clearSelection}
        onDelete={handleBulkDelete}
      />
    </FileDropzone>
  )
}
