import type { ReactNode } from "react"
import { toast } from "sonner"
import { cn } from "@travada-books/ui/lib/utils"
import { Upload01Icon } from "@travada-books/ui/icons"
import { useFileDropzone } from "@/hooks/use-file-dropzone"

type RejectionReason = "type" | "size" | "count"

type FileRejection = {
  file: File
  reason: RejectionReason
}

type FileDropzoneProps = {
  children: ReactNode
  onDropFiles: (files: File[]) => void
  disabled?: boolean
  className?: string
  /** Text shown in the drag overlay. Defaults to "Drop files here". */
  overlayText?: string
  accept?: string[]
  maxSize?: number
  maxFiles?: number
  onReject?: (rejections: FileRejection[]) => void
}

function defaultOnReject(rejections: FileRejection[]) {
  // One toast per reason, not one per file — avoids spamming the user on a bad multi-file drop.
  const reasons = new Set(rejections.map((r) => r.reason))
  if (reasons.has("type")) toast.error("Some files were skipped — unsupported file type")
  if (reasons.has("size")) toast.error("Some files were skipped — file too large")
  if (reasons.has("count")) toast.error("Some files were skipped — too many files")
}

/**
 * Wraps arbitrary content and shows a full-bleed overlay while a file is
 * being dragged over it. Reusable across Vault / Inbox / transaction
 * attachments.
 */
export function FileDropzone({
  children,
  onDropFiles,
  disabled,
  className,
  overlayText = "Drop files here",
  accept,
  maxSize,
  maxFiles,
  onReject = defaultOnReject,
}: FileDropzoneProps) {
  const { isDragging, dropzoneProps } = useFileDropzone({
    onDrop: onDropFiles,
    disabled,
    accept,
    maxSize,
    maxFiles,
    onReject,
  })

  return (
    <div className={cn("relative", className)} {...dropzoneProps}>
      {children}
      <div
        className={cn(
          "pointer-events-none invisible absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-background/95 opacity-0 transition-opacity",
          isDragging && "visible opacity-100",
        )}
      >
        <Upload01Icon size={24} className="text-muted-foreground" />
        <p className="text-sm font-medium">{overlayText}</p>
      </div>
    </div>
  )
}
