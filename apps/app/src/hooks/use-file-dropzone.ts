import { useCallback, useRef, useState } from "react"

type RejectionReason = "type" | "size" | "count"

type FileRejection = {
  file: File
  reason: RejectionReason
}

type UseFileDropzoneOptions = {
  onDrop: (files: File[]) => void
  disabled?: boolean
  /** e.g. ["image/*", "application/pdf"]. Undefined = accept everything. */
  accept?: string[]
  /** Max file size in bytes. */
  maxSize?: number
  /** Max number of files per drop. Excess files are rejected with reason "count". */
  maxFiles?: number
  onReject?: (rejections: FileRejection[]) => void
}

function matchesAccept(file: File, accept: string[]) {
  // Browsers sometimes report an empty type (e.g. some OS file pickers) — treat as acceptable,
  // matching the inline validators elsewhere in the app (see transaction-sheet.tsx).
  if (file.type === "") return true
  return accept.some((pattern) =>
    pattern.endsWith("/*") ? file.type.startsWith(pattern.slice(0, -1)) : file.type === pattern,
  )
}

/**
 * Hand-rolled native drag-and-drop — no react-dropzone, no tus.
 * Uses a drag-enter counter ref so nested children don't cause the overlay
 * to flicker on/off as the pointer crosses their boundaries (dragenter/leave
 * fire per-element, not just once for the whole dropzone).
 */
export function useFileDropzone({
  onDrop,
  disabled,
  accept,
  maxSize,
  maxFiles,
  onReject,
}: UseFileDropzoneOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounterRef = useRef(0)

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (disabled) return
      if (!e.dataTransfer.types.includes("Files")) return
      dragCounterRef.current += 1
      setIsDragging(true)
    },
    [disabled],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1)
    if (dragCounterRef.current === 0) setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current = 0
      setIsDragging(false)
      if (disabled) return
      const files = Array.from(e.dataTransfer.files ?? [])
      if (files.length === 0) return

      const rejections: FileRejection[] = []
      let candidates = files.filter((file) => {
        if (accept && !matchesAccept(file, accept)) {
          rejections.push({ file, reason: "type" })
          return false
        }
        if (maxSize !== undefined && file.size > maxSize) {
          rejections.push({ file, reason: "size" })
          return false
        }
        return true
      })

      if (maxFiles !== undefined && candidates.length > maxFiles) {
        const excess = candidates.slice(maxFiles)
        for (const file of excess) rejections.push({ file, reason: "count" })
        candidates = candidates.slice(0, maxFiles)
      }

      if (candidates.length > 0) onDrop(candidates)
      if (rejections.length > 0) onReject?.(rejections)
    },
    [disabled, onDrop, accept, maxSize, maxFiles, onReject],
  )

  return {
    isDragging,
    dropzoneProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  }
}
