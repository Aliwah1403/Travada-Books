import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@travada-books/ui/lib/utils"
import { Spokes } from "@travada-books/ui/components/spokes"
import { supabase } from "@/lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportMeta = {
  status?: string
  imported?: number
  total?: number
}

type Output = {
  imported: number
  skipped: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  downloading: "Downloading file…",
  extracting: "Reading bank statement…",
  parsing: "Reading CSV…",
  importing: "Importing transactions…",
  categorizing: "Analyzing transactions…",
  done: "Done",
}

function getProgress(meta: ImportMeta): number {
  if (meta.status === "done") return 100
  if (meta.status === "categorizing") return 92
  if (meta.status === "importing" && meta.total) {
    return 20 + Math.round(((meta.imported ?? 0) / meta.total) * 65)
  }
  const map: Record<string, number> = {
    downloading: 5,
    extracting: 15,
    parsing: 15,
    importing: 20,
  }
  return map[meta.status ?? ""] ?? 5
}

// ─── Toast component ──────────────────────────────────────────────────────────

function ImportProgressToast({
  toastId,
  runId,
  publicToken,
  orgId,
  rowCount,
}: {
  toastId: string | number
  runId: string
  publicToken: string
  orgId: string
  rowCount: number
}) {
  const queryClient = useQueryClient()
  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { run, error } = useRealtimeRun<{ imported: number; skipped: number }>(runId, {
    accessToken: publicToken,
  })

  // Supabase realtime — refresh table as rows arrive, debounced
  useEffect(() => {
    const channel = supabase
      .channel(`import-progress-${runId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `org_id=eq.${orgId}` },
        () => {
          if (invalidateTimer.current) clearTimeout(invalidateTimer.current)
          invalidateTimer.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["transactions", orgId] })
          }, 1500)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (invalidateTimer.current) clearTimeout(invalidateTimer.current)
    }
  }, [runId, orgId, queryClient])

  // On terminal status — final refresh then auto-dismiss
  const isTerminal = run?.status === "COMPLETED" || run?.status === "FAILED"
  useEffect(() => {
    if (!isTerminal) return
    queryClient.invalidateQueries({ queryKey: ["transactions", orgId] })
    const timer = setTimeout(() => toast.dismiss(toastId), 3500)
    return () => clearTimeout(timer)
  }, [isTerminal, orgId, queryClient, toastId])

  const meta = (run?.metadata ?? {}) as ImportMeta
  const isFailed = run?.status === "FAILED" || !!error
  const isDone = meta.status === "done"
  const output = run?.output as Output | undefined

  const progress = isDone ? 100 : getProgress(meta)
  const statusLabel = STATUS_LABELS[meta.status ?? ""] ?? "Starting…"
  const importedCount = meta.imported ?? 0
  const total = meta.total ?? rowCount

  return (
    <div className="w-80 rounded-xl border bg-background shadow-lg p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {/* Spinner / status indicator */}
          {!isDone && !isFailed && (
            <Spokes className="shrink-0 h-4 w-4 text-foreground" />
          )}
          {isDone && (
            <div className="shrink-0 h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {isFailed && (
            <div className="shrink-0 h-4 w-4 rounded-full bg-destructive flex items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M2 2L6 6M6 2L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium leading-none">
              {isFailed ? "Import failed" : isDone ? "Import complete" : "Importing transactions"}
            </p>
            {isDone && output && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {output.imported} imported
                {output.skipped > 0 ? `, ${output.skipped} skipped` : ""}
              </p>
            )}
            {!isDone && !isFailed && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{statusLabel}</p>
            )}
            {isFailed && (
              <p className="text-[11px] text-destructive mt-0.5">
                {error ? String(error) : "Something went wrong — try again"}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => toast.dismiss(toastId)}
          className="text-muted-foreground fine-hover:text-foreground transition-colors text-[11px] shrink-0 mt-0.5"
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      {!isFailed && (
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500 [transition-timing-function:var(--ease-out)]",
              isDone ? "bg-green-500" : "bg-foreground",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Row count during import */}
      {!isDone && !isFailed && meta.status === "importing" && total > 0 && (
        <p className="text-[10px] text-muted-foreground tabular-nums -mt-1">
          {importedCount} / {total} rows
        </p>
      )}
    </div>
  )
}

// ─── Public trigger function ──────────────────────────────────────────────────

export function showImportProgressToast({
  runId,
  publicToken,
  orgId,
  rowCount,
}: {
  runId: string
  publicToken: string
  orgId: string
  rowCount: number
}) {
  toast.custom(
    (t) => (
      <ImportProgressToast
        toastId={t}
        runId={runId}
        publicToken={publicToken}
        orgId={orgId}
        rowCount={rowCount}
      />
    ),
    {
      id: `csv-import-${runId}`,
      duration: Infinity,
    },
  )
}
