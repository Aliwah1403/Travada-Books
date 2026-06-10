import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@travada-books/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu"
import {
  SafeIcon,
  Search01Icon,
  Cancel01Icon,
  Upload01Icon,
  File01Icon,
  Image01Icon,
  Pdf01Icon,
  PencilEdit01Icon,
  ListViewIcon,
  GridIcon,
  Download01Icon,
  Delete01Icon,
  MoreVerticalIcon,
  Wallet01Icon,
  InboxIcon,
} from "@travada-books/ui/icons"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@travada-books/ui/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { DocumentPreviewSheet } from "@/components/vault/document-preview-sheet"
import {
  listDocuments,
  deleteDocument,
  renameDocument,
  getDocumentSignedUrl,
  uploadDocument,
  type VaultDocument,
  type VaultFilters,
} from "@/lib/queries/vault"

// ─── Types ───────────────────────────────────────────────────────────────────

type DocumentSource = VaultDocument["source"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function isImage(contentType: string | null): boolean {
  return !!contentType?.startsWith("image/")
}

function isPdf(contentType: string | null): boolean {
  return contentType === "application/pdf"
}

// ─── File type icon ───────────────────────────────────────────────────────────

function FileTypeIcon({
  contentType,
  size = "md",
}: {
  contentType: string | null
  size?: "sm" | "md"
}) {
  const dims = { sm: "size-8", md: "size-12" }[size]
  const iconSize = { sm: 14, md: 20 }[size]

  if (isPdf(contentType)) {
    return (
      <div className={cn("flex shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950", dims)}>
        <Pdf01Icon size={iconSize} className="text-red-500" />
      </div>
    )
  }
  if (isImage(contentType)) {
    return (
      <div className={cn("flex shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950", dims)}>
        <Image01Icon size={iconSize} className="text-blue-500" />
      </div>
    )
  }
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-lg bg-muted", dims)}>
      <File01Icon size={iconSize} className="text-muted-foreground" />
    </div>
  )
}

// ─── Source badge ─────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<DocumentSource, string> = {
  upload: "Upload",
  transaction: "Transaction",
  inbox: "Inbox",
}

const SOURCE_CLASSES: Record<DocumentSource, string> = {
  upload: "bg-muted text-muted-foreground",
  transaction: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  inbox: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
}

function SourceBadge({ source }: { source: DocumentSource }) {
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium", SOURCE_CLASSES[source])}>
      {SOURCE_LABELS[source]}
    </span>
  )
}

// ─── Rename dialog ────────────────────────────────────────────────────────────

function RenameDialog({
  doc,
  open,
  onOpenChange,
  onSave,
}: {
  doc: VaultDocument | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, name: string) => void
}) {
  const [value, setValue] = useState("")

  useEffect(() => {
    if (open && doc) setValue(doc.name)
  }, [open, doc])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || !doc || trimmed === doc.name) {
      onOpenChange(false)
      return
    }
    onSave(doc.id, trimmed)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            placeholder="Document name"
            className="text-sm"
          />
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!value.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Document actions ─────────────────────────────────────────────────────────

function DocActions({
  onDownload,
  onRename,
  onDelete,
}: {
  onDownload: () => void
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors fine-hover:bg-muted fine-hover:text-foreground focus-visible:outline-none" />
        }
      >
        <MoreVerticalIcon size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={onDownload} className="gap-2">
          <Download01Icon size={13} className="shrink-0" />
          Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRename} className="gap-2">
          <PencilEdit01Icon size={13} className="shrink-0" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <Delete01Icon size={13} className="shrink-0" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Tag pills ────────────────────────────────────────────────────────────────

const MAX_VISIBLE_TAGS = 3

function TagPills({ tags }: { tags: string[] | null }) {
  if (!tags?.length) return null
  const visible = tags.slice(0, MAX_VISIBLE_TAGS)
  const overflow = tags.length - MAX_VISIBLE_TAGS
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((tag) => (
        <span
          key={tag}
          className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {tag}
        </span>
      ))}
      {overflow > 0 && (
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  )
}

// ─── Grid card ────────────────────────────────────────────────────────────────

function DocumentCard({
  doc,
  onOpen,
  onDownload,
  onRename,
  onDelete,
}: {
  doc: VaultDocument
  onOpen: (doc: VaultDocument) => void
  onDownload: (doc: VaultDocument) => void
  onRename: (doc: VaultDocument) => void
  onDelete: (doc: VaultDocument) => void
}) {
  return (
    <div
      className="group relative flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 transition-colors fine-hover:bg-accent/30 active:opacity-80"
      onClick={() => onOpen(doc)}
    >
      <div className="flex items-start justify-between gap-2">
        <FileTypeIcon contentType={doc.content_type} size="md" />
        <div className="opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          <DocActions onDownload={() => onDownload(doc)} onRename={() => onRename(doc)} onDelete={() => onDelete(doc)} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs font-medium leading-relaxed">{doc.name}</p>
      </div>

      <TagPills tags={doc.tags} />

      <div className="flex items-center justify-between gap-2">
        <SourceBadge source={doc.source} />
        <span className="text-[10px] text-muted-foreground">{formatBytes(doc.file_size)}</span>
      </div>

      <p className="text-[10px] text-muted-foreground">{formatDate(doc.created_at)}</p>
    </div>
  )
}

// ─── List row ─────────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  onOpen,
  onDownload,
  onRename,
  onDelete,
}: {
  doc: VaultDocument
  onOpen: (doc: VaultDocument) => void
  onDownload: (doc: VaultDocument) => void
  onRename: (doc: VaultDocument) => void
  onDelete: (doc: VaultDocument) => void
}) {
  return (
    <div
      className="group flex cursor-pointer items-center gap-4 border-b px-4 py-3 last:border-0 fine-hover:bg-accent/30 transition-colors active:opacity-80"
      onClick={() => onOpen(doc)}
    >
      <FileTypeIcon contentType={doc.content_type} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{doc.name}</p>
      </div>

      {doc.tags && doc.tags.length > 0 && (
        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          {doc.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {doc.tags.length > 2 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              +{doc.tags.length - 2}
            </span>
          )}
        </div>
      )}

      <SourceBadge source={doc.source} />

      <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
        {formatBytes(doc.file_size)}
      </span>

      <span className="w-28 shrink-0 text-right text-xs text-muted-foreground">
        {formatDate(doc.created_at)}
      </span>

      <div className="opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
        <DocActions onDownload={() => onDownload(doc)} onRename={() => onRename(doc)} onDelete={() => onDelete(doc)} />
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="size-12 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-1.5">
            <div className="h-2.5 w-full animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-3/4 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-3 w-10 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type SourceFilter = "all" | DocumentSource

const FILTER_TABS: {
  value: SourceFilter
  label: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
}[] = [
  { value: "all", label: "All" },
  { value: "upload", label: "Uploads", icon: Upload01Icon },
  { value: "transaction", label: "Transactions", icon: Wallet01Icon },
  { value: "inbox", label: "Inbox", icon: InboxIcon },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export function VaultPage() {
  const { orgId } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [renamingDoc, setRenamingDoc] = useState<VaultDocument | null>(null)
  const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null)

  const searchTimer = useRef(0)
  function handleSearchChange(val: string) {
    setSearch(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => setDebouncedSearch(val), 350)
  }

  const filters: VaultFilters = {
    source: sourceFilter !== "all" ? sourceFilter : undefined,
    search: debouncedSearch || undefined,
  }

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["vault", orgId, filters],
    queryFn: () => listDocuments(orgId!, filters),
    enabled: !!orgId,
    placeholderData: (prev) => prev,
  })

  // Count per source for tab badges (unfiltered)
  const { data: allDocs = [] } = useQuery({
    queryKey: ["vault", orgId, {}],
    queryFn: () => listDocuments(orgId!, {}),
    enabled: !!orgId,
  })
  const countBySource = (source: DocumentSource) => allDocs.filter((d) => d.source === source).length

  const deleteMutation = useMutation({
    mutationFn: (doc: VaultDocument) => deleteDocument(doc.id, doc.file_path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", orgId] })
    },
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameDocument(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", orgId] })
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocument(orgId!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", orgId] })
    },
  })

  function handleDownload(doc: VaultDocument) {
    toast.promise(
      getDocumentSignedUrl(doc.file_path).then((url) => {
        const a = document.createElement("a")
        a.href = url
        a.download = doc.name
        a.target = "_blank"
        a.click()
      }),
      {
        loading: "Preparing download…",
        success: "Download started",
        error: "Failed to get download link",
      },
    )
  }

  function handleDelete(doc: VaultDocument) {
    toast.promise(deleteMutation.mutateAsync(doc), {
      loading: "Deleting document…",
      success: "Document deleted",
      error: "Failed to delete document",
    })
  }

  function handleRename(id: string, name: string) {
    toast.promise(renameMutation.mutateAsync({ id, name }), {
      loading: "Renaming…",
      success: "Document renamed",
      error: "Failed to rename document",
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ""

    for (const file of files) {
      toast.promise(uploadMutation.mutateAsync(file), {
        loading: `Uploading ${file.name}…`,
        success: `${file.name} uploaded`,
        error: `Failed to upload ${file.name}`,
      })
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <DocumentPreviewSheet
        doc={previewDoc}
        open={!!previewDoc}
        onOpenChange={(open) => { if (!open) setPreviewDoc(null) }}
        onDeleted={() => setPreviewDoc(null)}
        onOpenDoc={setPreviewDoc}
      />

      <RenameDialog
        doc={renamingDoc}
        open={!!renamingDoc}
        onOpenChange={(open) => { if (!open) setRenamingDoc(null) }}
        onSave={handleRename}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Vault</h1>
          <p className="text-xs text-muted-foreground">Secure document storage for your organization</p>
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

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b">
        {FILTER_TABS.map(({ value, label, icon: TabIcon }) => (
          <button
            key={value}
            onClick={() => setSourceFilter(value)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-0.5 text-xs font-medium transition-colors",
              sourceFilter === value
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground fine-hover:text-foreground",
            )}
          >
            {TabIcon && <TabIcon size={12} />}
            {label}
            {value !== "all" && (
              <span className="rounded px-1 py-0.5 text-[10px] bg-muted text-muted-foreground">
                {countBySource(value as DocumentSource)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-72">
          <Search01Icon
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search documents…"
            className="h-9 pl-8 pr-8 text-xs"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {search && (
            <button
              onClick={() => {
                setSearch("")
                setDebouncedSearch("")
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors fine-hover:text-foreground"
            >
              <Cancel01Icon size={13} />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-lg border p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex size-7 items-center justify-center rounded-md transition-colors",
              viewMode === "grid"
                ? "bg-muted text-foreground"
                : "text-muted-foreground fine-hover:text-foreground",
            )}
          >
            <GridIcon size={14} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex size-7 items-center justify-center rounded-md transition-colors",
              viewMode === "list"
                ? "bg-muted text-foreground"
                : "text-muted-foreground fine-hover:text-foreground",
            )}
          >
            <ListViewIcon size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <SkeletonGrid />
      ) : docs.length === 0 ? (
        <EmptyState
          icon={SafeIcon}
          title={search || sourceFilter !== "all" ? "No documents found" : "Your vault is empty"}
          description={
            search || sourceFilter !== "all"
              ? "Try a different search or filter"
              : "Upload documents or attach files to transactions — they'll appear here automatically"
          }
          action={
            !search && sourceFilter === "all" ? (
              <Button size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload01Icon size={13} />
                Upload a document
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {docs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onOpen={setPreviewDoc}
              onDownload={handleDownload}
              onRename={setRenamingDoc}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center gap-4 border-b bg-muted/40 px-4 py-2">
            <div className="size-8 shrink-0" />
            <span className="flex-1 text-[11px] font-medium text-muted-foreground">Name</span>
            <span className="text-[11px] font-medium text-muted-foreground">Source</span>
            <span className="w-16 shrink-0 text-right text-[11px] font-medium text-muted-foreground">Size</span>
            <span className="w-28 shrink-0 text-right text-[11px] font-medium text-muted-foreground">Date</span>
            <div className="size-7 shrink-0" />
          </div>
          {docs.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              onOpen={setPreviewDoc}
              onDownload={handleDownload}
              onRename={setRenamingDoc}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {docs.length} document{docs.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  )
}
