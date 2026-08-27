import { useEffect } from "react"
import { toast } from "sonner"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { cn } from "@travada-books/ui/lib/utils"
import { Spokes } from "@travada-books/ui/components/spokes"
import { CancelCircleIcon, Cancel01Icon, CheckmarkCircle01Icon } from "@travada-books/ui/icons"
import { useRealtime, useDebouncedCallback } from "@/hooks/use-realtime"
import { useInvalidateTransactionQueries } from "@/hooks/use-invalidate-transaction-queries"

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

// Trigger.dev RunStatus terminal-failure states beyond "FAILED" — without these,
// a run that ends in one of them never flips isTerminal, so the toast (duration:
// Infinity) never auto-dismisses and lingers stacked behind future imports.
const TERMINAL_FAILURE_STATUSES = new Set([
  "FAILED",
  "CANCELED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "EXPIRED",
  "TIMED_OUT",
])

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
  const invalidateTransactionQueries = useInvalidateTransactionQueries()
  const debouncedInvalidateTransactions = useDebouncedCallback(invalidateTransactionQueries, 1500)

  const { run, error } = useRealtimeRun<{ imported: number; skipped: number }>(runId, {
    accessToken: publicToken,
  })

  // Supabase realtime — refresh transactions + dashboard metrics as rows
  // arrive, debounced so a hundred-row import doesn't fire a hundred refetches.
  useRealtime({
    channelName: "import-progress",
    table: "transactions",
    events: ["INSERT"],
    filter: orgId ? `org_id=eq.${orgId}` : undefined,
    onEvent: debouncedInvalidateTransactions,
  })

  const isFailed = (!!run?.status && TERMINAL_FAILURE_STATUSES.has(run.status)) || !!error

  // On terminal status — final refresh then auto-dismiss
  const isTerminal = run?.status === "COMPLETED" || isFailed
  useEffect(() => {
    if (!isTerminal) return
    invalidateTransactionQueries()
    const timer = setTimeout(() => toast.dismiss(toastId), 3500)
    return () => clearTimeout(timer)
  }, [isTerminal, toastId, invalidateTransactionQueries])

  const meta = (run?.metadata ?? {}) as ImportMeta
  const isDone = meta.status === "done"
  const output = run?.output as Output | undefined

  const progress = isDone ? 100 : getProgress(meta)
  const statusLabel = STATUS_LABELS[meta.status ?? ""] ?? "Starting…"
  const importedCount = meta.imported ?? 0
  const total = meta.total ?? rowCount

  return (
    // No card chrome here — this renders inside the shared toast `<li>`
    // (packages/ui/src/components/sonner.tsx classNames.toast), which already
    // supplies bg-popover/shadow-md/ring/rounded-lg/padding. Redrawing it here
    // used to nest a second card surface, showing as a "peeking" second toast.
    <div className="flex w-full flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {/* Spinner / status indicator */}
          {!isDone && !isFailed && (
            <Spokes className="shrink-0 h-4 w-4 text-muted-foreground" />
          )}
          {isDone && (
            <CheckmarkCircle01Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          {isFailed && (
            <CancelCircleIcon className="size-4 shrink-0 text-red-700 dark:text-red-400" />
          )}

          <div className="flex flex-col gap-0.5">
            <p className="font-heading text-xs font-medium leading-none">
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
          className="text-muted-foreground fine-hover:text-foreground transition-colors shrink-0 mt-0.5"
        >
          <Cancel01Icon className="size-3" />
        </button>
      </div>

      {/* Progress bar */}
      {!isFailed && (
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500 [transition-timing-function:var(--ease-out)]",
              isDone ? "bg-emerald-600 dark:bg-emerald-400" : "bg-primary",
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
