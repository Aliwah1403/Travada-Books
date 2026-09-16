import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu"
import {
  MoreVerticalIcon,
  Download01Icon,
  Link01Icon,
  Delete01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  File01Icon,
  ReloadIcon,
  MailBlock01Icon,
  Globe02Icon,
} from "@travada-books/ui/icons"
import { formatCurrency } from "@/lib/format"
import { getInboxSignedUrl, type InboxItem } from "@/lib/queries/inbox"
import { InboxStatus } from "@/components/inbox/inbox-status"
import { InboxDetailsSkeleton } from "@/components/inbox/inbox-skeletons"
import { InboxActions } from "@/components/inbox/inbox-actions"
import { InboxSourceIcon } from "@/components/inbox/inbox-source-icon"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const TYPE_LABEL: Record<NonNullable<InboxItem["type"]>, string> = {
  invoice: "Invoice",
  expense: "Expense",
  other: "Other",
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}

function InboxPreview({
  item,
  signedUrl,
  isLoadingUrl,
}: {
  item: InboxItem
  signedUrl: string | null
  isLoadingUrl: boolean
}) {
  if (isLoadingUrl || !signedUrl) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />
  }

  if (item.content_type === "application/pdf") {
    return (
      <div className="overflow-hidden rounded-xl border bg-muted" style={{ height: 360 }}>
        <iframe
          src={`${signedUrl}#toolbar=0&navpanes=0`}
          title={item.display_name ?? item.file_name}
          className="h-full w-full"
        />
      </div>
    )
  }

  if (item.content_type?.startsWith("image/")) {
    return (
      <div
        className="flex items-center justify-center overflow-hidden rounded-xl border bg-muted/40"
        style={{ minHeight: 200 }}
      >
        <img
          src={signedUrl}
          alt={item.display_name ?? item.file_name}
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

type Props = {
  item: InboxItem | null
  isLoading: boolean
  onMarkDone: (item: InboxItem) => void
  onMarkUnhandled: (item: InboxItem) => void
  onDelete: (item: InboxItem) => void
  onRetryMatching: (item: InboxItem) => void
  onBlockEmail: (item: InboxItem) => void
  onBlockDomain: (item: InboxItem) => void
  isMutating: boolean
}

export function InboxDetails({
  item,
  isLoading,
  onMarkDone,
  onMarkUnhandled,
  onDelete,
  onRetryMatching,
  onBlockEmail,
  onBlockDomain,
  isMutating,
}: Props) {
  const { data: signedUrl, isLoading: isLoadingUrl } = useQuery({
    queryKey: ["inbox-signed-url", item?.file_path],
    queryFn: () => getInboxSignedUrl(item!.file_path),
    enabled: !!item,
    staleTime: 50 * 60 * 1000, // 50 min (URL valid for 1 hr)
  })

  if (isLoading) return <InboxDetailsSkeleton />

  if (!item) {
    return (
      <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
        Select an item to preview
      </div>
    )
  }

  function handleDownload() {
    if (!signedUrl || !item) return
    const a = document.createElement("a")
    a.href = signedUrl
    a.download = item.file_name
    a.target = "_blank"
    a.click()
  }

  function handleCopyLink() {
    if (!item) return
    const url = `${window.location.origin}/inbox?inboxId=${item.id}`
    navigator.clipboard.writeText(url)
    toast.success("Link copied to clipboard")
  }

  const isDone = item.status === "done" || !!item.transaction_id
  const name = item.display_name ?? item.file_name
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-snug">{name}</p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              {item.amount != null && item.currency && (
                <span className="font-medium text-foreground">
                  {formatCurrency(item.amount, item.currency)}
                </span>
              )}
              {item.date && <span>{formatDate(item.date)}</span>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <InboxSourceIcon item={item} className="border-r pr-2" />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors fine-hover:bg-muted fine-hover:text-foreground focus-visible:outline-none" />
              }
            >
              <MoreVerticalIcon size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isDone ? (
                <DropdownMenuItem onClick={() => onMarkUnhandled(item)} disabled={isMutating} className="gap-2">
                  <Clock01Icon size={13} className="shrink-0" />
                  Mark unhandled
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onMarkDone(item)} disabled={isMutating} className="gap-2">
                  <CheckmarkCircle01Icon size={13} className="shrink-0" />
                  Mark done
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDownload} disabled={!signedUrl} className="gap-2">
                <Download01Icon size={13} className="shrink-0" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink} className="gap-2">
                <Link01Icon size={13} className="shrink-0" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRetryMatching(item)} disabled={isMutating} className="gap-2">
                <ReloadIcon size={13} className="shrink-0" />
                Retry matching
              </DropdownMenuItem>
              {item.sender_email && (
                <>
                  <DropdownMenuItem onClick={() => onBlockEmail(item)} disabled={isMutating} className="gap-2">
                    <MailBlock01Icon size={13} className="shrink-0" />
                    Block sender email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBlockDomain(item)} disabled={isMutating} className="gap-2">
                    <Globe02Icon size={13} className="shrink-0" />
                    Block sender domain
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(item)}
                disabled={isMutating}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Delete01Icon size={13} className="shrink-0" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-5 px-5 py-5">
        <InboxPreview item={item} signedUrl={signedUrl ?? null} isLoadingUrl={isLoadingUrl} />

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <Field label="Date" value={item.date ? formatDate(item.date) : "—"} />
          <Field
            label="Amount"
            value={item.amount != null && item.currency ? formatCurrency(item.amount, item.currency) : "—"}
          />
          <Field label="Currency" value={item.currency ?? "—"} />
          <Field
            label="Tax"
            value={item.tax_amount != null ? formatCurrency(item.tax_amount, item.currency ?? "USD") : "—"}
          />
          <Field label="Invoice #" value={item.invoice_number ?? "—"} />
          <Field label="Type" value={item.type ? TYPE_LABEL[item.type] : "—"} />
          <Field label="Sender" value={item.sender_email ?? "—"} />
          <Field label="Status" value={<InboxStatus item={item} />} />
        </div>

        <div className="border-t" />

        <InboxActions item={item} />
      </div>
    </div>
  )
}
