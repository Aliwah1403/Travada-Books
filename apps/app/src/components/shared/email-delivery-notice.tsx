import { useEffect, useState } from "react"
import { MailBlock01Icon } from "@travada-books/ui/icons"
import { Button } from "@travada-books/ui/components/button"

// Below this, a "queued" send is just normal async latency — no need to
// alarm the user. Past it, something is probably stuck.
const STILL_SENDING_THRESHOLD_MS = 3 * 60 * 1000

function computeIsStale(statusAt: string | null | undefined, thresholdMs: number): boolean {
  if (!statusAt) return false
  return Date.now() - new Date(statusAt).getTime() > thresholdMs
}

// Date.now() is impure, so it can't be called during render (React purity
// rules) — seed state from it via useState's lazy initializer (the sanctioned
// one-time-impure-read pattern) and only ever update it from a timer
// callback, never synchronously in the effect body. Callers key this
// component on statusAt so a new value remounts it instead of needing a
// reset effect.
function useIsStale(statusAt: string | null | undefined, thresholdMs: number): boolean {
  const [isStale, setIsStale] = useState(() => computeIsStale(statusAt, thresholdMs))

  useEffect(() => {
    const interval = setInterval(() => {
      setIsStale(computeIsStale(statusAt, thresholdMs))
    }, 30_000)
    return () => clearInterval(interval)
  }, [statusAt, thresholdMs])

  return isStale
}

type EmailDeliveryNoticeProps = {
  status: "queued" | "sent" | "failed" | null | undefined
  statusAt: string | null | undefined
  /** Who the email was going to — shown in the failed message when known. */
  recipient?: string | null
  error?: string | null
  onRetry: () => void
  retrying: boolean
}

// Sending an invoice/quote/statement by email can queue a background render
// (see DOCUMENT-PDF-PLAN.md) — this surfaces what happened next on the
// document's own detail page, since the document itself is already marked
// sent by the time this can fail.
export function EmailDeliveryNotice({
  status,
  statusAt,
  recipient,
  error,
  onRetry,
  retrying,
}: EmailDeliveryNoticeProps) {
  const isStale = useIsStale(statusAt, STILL_SENDING_THRESHOLD_MS)

  if (status === "failed") {
    return (
      <div className='mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs dark:border-red-900/40 dark:bg-red-900/20'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex items-start gap-2 text-red-700 dark:text-red-400'>
            <MailBlock01Icon size={14} className='mt-0.5 shrink-0' />
            <div>
              <p className='font-medium'>
                {recipient ? `Email to ${recipient} wasn't delivered` : "Email wasn't delivered"}
              </p>
              {error && (
                <p className='mt-1 text-red-600/80 dark:text-red-400/70'>{error}</p>
              )}
            </div>
          </div>
          <Button
            size='sm'
            variant='outline'
            className='shrink-0 gap-1.5 border-red-300 text-red-700 fine-hover:bg-red-100 dark:border-red-900/60 dark:text-red-400 dark:fine-hover:bg-red-900/30'
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying ? "Retrying…" : "Try again"}
          </Button>
        </div>
      </div>
    )
  }

  if (status === "queued") {
    if (!isStale) return null
    return (
      <div className='mb-4 rounded-lg border bg-muted/40 px-4 py-3 text-xs text-muted-foreground'>
        Email still sending…
      </div>
    )
  }

  return null
}
