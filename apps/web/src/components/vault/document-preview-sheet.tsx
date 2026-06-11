import { useState, useEffect, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Link } from "react-router"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@travada-books/ui/components/sheet"
import { Button } from "@travada-books/ui/components/button"
import { Textarea } from "@travada-books/ui/components/textarea"
import { Input } from "@travada-books/ui/components/input"
import {
  Download01Icon,
  Delete01Icon,
  Tag01Icon,
  Cancel01Icon,
  SparklesIcon,
  PencilEdit01Icon,
  Wallet01Icon,
  Pdf01Icon,
  Image01Icon,
  File01Icon,
} from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import {
  getDocumentSignedUrl,
  updateDocument,
  deleteDocument,
  renameDocument,
  listRelatedDocuments,
  type VaultDocument,
  type VaultFolder,
} from "@/lib/queries/vault"

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

function isPdf(ct: string | null) { return ct === "application/pdf" }
function isImage(ct: string | null) { return !!ct?.startsWith("image/") }

// ─── Preview area ─────────────────────────────────────────────────────────────

function DocumentPreview({
  doc,
  signedUrl,
  isLoadingUrl,
}: {
  doc: VaultDocument
  signedUrl: string | null
  isLoadingUrl: boolean
}) {
  if (isLoadingUrl || !signedUrl) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-muted animate-pulse" />
    )
  }

  if (isPdf(doc.content_type)) {
    return (
      <div className="overflow-hidden rounded-xl border bg-muted" style={{ height: 360 }}>
        <iframe
          src={`${signedUrl}#toolbar=0&navpanes=0`}
          title={doc.name}
          className="h-full w-full"
        />
      </div>
    )
  }

  if (isImage(doc.content_type)) {
    return (
      <div className="flex items-center justify-center overflow-hidden rounded-xl border bg-muted/40" style={{ minHeight: 200 }}>
        <img
          src={signedUrl}
          alt={doc.name}
          className="max-h-96 w-full object-contain"
        />
      </div>
    )
  }

  return (
    <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border bg-muted text-muted-foreground">
      <File01Icon size={32} />
      <p className="text-xs">No preview available</p>
    </div>
  )
}

// ─── Tags input ───────────────────────────────────────────────────────────────

function TagsInput({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-")
    if (!tag || tags.includes(tag)) {
      setInputValue("")
      return
    }
    onChange([...tags, tag])
    setInputValue("")
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div
      className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
            className="text-muted-foreground fine-hover:text-foreground transition-colors"
          >
            <Cancel01Icon size={10} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputValue.trim()) addTag(inputValue) }}
        placeholder={tags.length === 0 ? "Add tags…" : ""}
        className="min-w-16 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

// ─── File type chip ───────────────────────────────────────────────────────────

function FileTypeChip({ contentType }: { contentType: string | null }) {
  if (isPdf(contentType)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500 dark:bg-red-950">
        <Pdf01Icon size={11} /> PDF
      </span>
    )
  }
  if (isImage(contentType)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-500 dark:bg-blue-950">
        <Image01Icon size={11} /> Image
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <File01Icon size={11} /> File
    </span>
  )
}

// ─── Inline name editor ───────────────────────────────────────────────────────

function InlineName({
  name,
  onSave,
}: {
  name: string
  onSave: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setValue(name) }, [name])
  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  function commit() {
    setEditing(false)
    const trimmed = value.trim()
    if (trimmed && trimmed !== name) onSave(trimmed)
    else setValue(name)
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") { setValue(name); setEditing(false) }
        }}
        className="h-auto border-0 p-0 text-sm font-semibold leading-snug shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-start gap-1.5 text-left"
      title="Click to rename"
    >
      <span className="text-sm font-semibold leading-snug">{name}</span>
      <PencilEdit01Icon
        size={12}
        className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
      />
    </button>
  )
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

type Props = {
  doc: VaultDocument | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
  onOpenDoc?: (doc: VaultDocument) => void
  folders?: VaultFolder[]
}

export function DocumentPreviewSheet({ doc, open, onOpenChange, onDeleted, onOpenDoc, folders = [] }: Props) {
  const queryClient = useQueryClient()

  const [summary, setSummary] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [summaryDirty, setSummaryDirty] = useState(false)

  // Sync local state when doc changes
  useEffect(() => {
    if (doc) {
      setSummary(doc.summary ?? "")
      setTags(doc.tags ?? [])
      setSummaryDirty(false)
    }
  }, [doc?.id])

  // Signed URL — fetched once per doc open
  const { data: signedUrl, isLoading: isLoadingUrl } = useQuery({
    queryKey: ["vault-signed-url", doc?.file_path],
    queryFn: () => getDocumentSignedUrl(doc!.file_path),
    enabled: open && !!doc,
    staleTime: 50 * 60 * 1000, // 50 min (URL valid for 1 hr)
  })

  // Related documents — low-priority FTS query, non-blocking
  const { data: relatedDocs = [], isLoading: isLoadingRelated } = useQuery({
    queryKey: ["vault-related", doc?.id, doc?.name],
    queryFn: () => listRelatedDocuments(doc!.org_id, doc!.id, doc!.name),
    enabled: open && !!doc,
    staleTime: 5 * 60 * 1000,
  })

  const updateMutation = useMutation({
    mutationFn: (patch: { summary?: string | null; tags?: string[] | null }) =>
      updateDocument(doc!.id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vault"] }),
  })

  const renameMutation = useMutation({
    mutationFn: (name: string) => renameDocument(doc!.id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vault"] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocument(doc!.id, doc!.file_path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault"] })
      onOpenChange(false)
      onDeleted()
    },
  })

  function handleDownload() {
    if (!signedUrl || !doc) return
    const a = document.createElement("a")
    a.href = signedUrl
    a.download = doc.name
    a.target = "_blank"
    a.click()
  }

  function handleDelete() {
    toast.promise(deleteMutation.mutateAsync(), {
      loading: "Deleting document…",
      success: "Document deleted",
      error: "Failed to delete document",
    })
  }

  function handleSummaryBlur() {
    if (!summaryDirty || !doc) return
    updateMutation.mutate({ summary: summary || null })
    setSummaryDirty(false)
  }

  const handleTagsChange = useCallback(
    (next: string[]) => {
      setTags(next)
      updateMutation.mutate({ tags: next.length ? next : null })
    },
    [doc?.id],
  )

  if (!doc) return null

  const SOURCE_LABEL: Record<VaultDocument["source"], string> = {
    upload: "Manual upload",
    transaction: "Transaction attachment",
    inbox: "Inbox",
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg overflow-hidden">
        <SheetTitle className="sr-only">{doc.name}</SheetTitle>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <InlineName
            name={doc.name}
            onSave={(name) => {
              toast.promise(renameMutation.mutateAsync(name), {
                loading: "Renaming…",
                success: "Renamed",
                error: "Failed to rename",
              })
            }}
          />
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={handleDownload}
              disabled={!signedUrl}
              title="Download"
            >
              <Download01Icon size={15} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive fine-hover:text-destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              title="Delete"
            >
              <Delete01Icon size={15} />
            </Button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
          {/* Preview */}
          <DocumentPreview
            doc={doc}
            signedUrl={signedUrl ?? null}
            isLoadingUrl={isLoadingUrl}
          />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
            <div>
              <p className="text-muted-foreground">Type</p>
              <div className="mt-1">
                <FileTypeChip contentType={doc.content_type} />
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Size</p>
              <p className="mt-1 font-medium">{formatBytes(doc.file_size)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Source</p>
              <p className="mt-1 font-medium">{SOURCE_LABEL[doc.source]}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Added</p>
              <p className="mt-1 font-medium">{formatDate(doc.created_at)}</p>
            </div>
            {folders.length > 0 && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Folder</p>
                <select
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-ring"
                  value={doc.folder_id ?? ""}
                  onChange={(e) => {
                    const folderId = e.target.value || null
                    updateMutation.mutate({ folder_id: folderId })
                  }}
                >
                  <option value="">No folder</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}
            {doc.transaction_id && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Linked transaction</p>
                <Link
                  to={`/transactions`}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-2 fine-hover:underline"
                >
                  <Wallet01Icon size={12} />
                  View transaction
                </Link>
              </div>
            )}
          </div>

          <div className="border-t" />

          {/* Summary / description */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">Description</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-[11px] text-muted-foreground"
                disabled
                title="AI generation coming soon"
              >
                <SparklesIcon size={12} />
                Generate with AI
              </Button>
            </div>
            <Textarea
              value={summary}
              onChange={(e) => { setSummary(e.target.value); setSummaryDirty(true) }}
              onBlur={handleSummaryBlur}
              placeholder="Add a description for this document…"
              className="min-h-24 resize-none text-xs"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Tag01Icon size={13} className="text-muted-foreground" />
              <p className="text-xs font-medium">Tags</p>
            </div>
            <TagsInput tags={tags} onChange={handleTagsChange} />
            <p className="text-[10px] text-muted-foreground">
              Press Enter or comma to add a tag
            </p>
          </div>

          {/* Related documents */}
          {(isLoadingRelated || relatedDocs.length > 0) && (
            <>
              <div className="border-t" />
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium">Related documents</p>

                {isLoadingRelated ? (
                  <div className="flex flex-col gap-1.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg p-2">
                        <div className="size-8 shrink-0 animate-pulse rounded-lg bg-muted" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2.5 w-3/4 animate-pulse rounded bg-muted" />
                          <div className="h-2 w-1/3 animate-pulse rounded bg-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {relatedDocs.map((related) => (
                      <button
                        key={related.id}
                        onClick={() => onOpenDoc?.(related)}
                        className="flex items-center gap-3 rounded-lg p-2 text-left transition-colors fine-hover:bg-muted active:opacity-80"
                      >
                        <RelatedFileIcon contentType={related.content_type} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{related.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(related.created_at)}
                          </p>
                        </div>
                        <RelatedSourceBadge source={related.source} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Related doc sub-components ───────────────────────────────────────────────
// Kept small — just the icon and source badge in compact form

function RelatedFileIcon({ contentType }: { contentType: string | null }) {
  if (isPdf(contentType)) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950">
        <Pdf01Icon size={13} className="text-red-500" />
      </div>
    )
  }
  if (isImage(contentType)) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
        <Image01Icon size={13} className="text-blue-500" />
      </div>
    )
  }
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
      <File01Icon size={13} className="text-muted-foreground" />
    </div>
  )
}

function RelatedSourceBadge({ source }: { source: VaultDocument["source"] }) {
  const cls: Record<VaultDocument["source"], string> = {
    upload: "bg-muted text-muted-foreground",
    transaction: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
    inbox: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  }
  const label: Record<VaultDocument["source"], string> = {
    upload: "Upload",
    transaction: "Tx",
    inbox: "Inbox",
  }
  return (
    <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium", cls[source])}>
      {label[source]}
    </span>
  )
}
