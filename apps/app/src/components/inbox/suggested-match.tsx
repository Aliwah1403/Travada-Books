import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@travada-books/ui/components/button"
import { CheckmarkCircle02Icon, CancelCircleIcon } from "@travada-books/ui/icons"
import { useAuth } from "@/contexts/auth-context"
import { formatCurrency } from "@/lib/format"
import { confirmSuggestion, declineSuggestion, type InboxItem, type InboxSuggestion } from "@/lib/queries/inbox"

// Midday's MatchLearningToastSeen equivalent — shown once ever, not per item.
const LEARNING_TOAST_KEY = "travada:inbox-match-learning-toast-seen"

function maybeShowLearningToast() {
  if (typeof window === "undefined") return
  if (localStorage.getItem(LEARNING_TOAST_KEY)) return
  localStorage.setItem(LEARNING_TOAST_KEY, "1")
  toast("Travada learns from your confirmations", {
    description: "Matches from this vendor will get faster and more accurate over time.",
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

type Props = {
  item: InboxItem
  suggestion: InboxSuggestion
  orgId: string
}

export function SuggestedMatch({ item, suggestion, orgId }: Props) {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["inbox", orgId] })
    queryClient.invalidateQueries({ queryKey: ["inbox-item", item.id] })
  }

  const confirmMutation = useMutation({
    mutationFn: () =>
      confirmSuggestion(
        suggestion.id,
        item.id,
        suggestion.transaction_id,
        orgId,
        user!.id,
        item.display_name ?? item.file_name,
        suggestion.transaction?.counterparty_name ?? suggestion.transaction?.name ?? "a transaction",
        profile?.full_name ?? user?.email ?? null,
      ),
    onSuccess: () => {
      invalidate()
      maybeShowLearningToast()
    },
  })

  const declineMutation = useMutation({
    mutationFn: () => declineSuggestion(suggestion.id, item.id, user!.id),
    onSuccess: invalidate,
  })

  function handleConfirm() {
    toast.promise(confirmMutation.mutateAsync(), {
      loading: "Confirming match…",
      success: "Match confirmed",
      error: "Failed to confirm match",
    })
  }

  function handleDecline() {
    toast.promise(declineMutation.mutateAsync(), {
      loading: "Declining match…",
      success: "Match declined",
      error: "Failed to decline match",
    })
  }

  const tx = suggestion.transaction
  const isMutating = confirmMutation.isPending || declineMutation.isPending
  const confidencePct = Math.round((suggestion.confidence_score ?? 0) * 100)

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 rounded-lg border p-4 duration-200 [animation-timing-function:var(--ease-out)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">Suggested match</p>
        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
          {confidencePct}% confidence
        </span>
      </div>

      {tx && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{tx.counterparty_name ?? tx.name}</p>
            <p className="text-[10px] text-muted-foreground">{formatDate(tx.date)}</p>
          </div>
          <span className="shrink-0 text-xs font-medium tabular-nums">
            {formatCurrency(tx.amount, tx.currency)}
          </span>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={isMutating}
          className="flex-1 gap-1.5"
        >
          <CheckmarkCircle02Icon size={13} />
          Confirm
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDecline}
          disabled={isMutating}
          className="flex-1 gap-1.5"
        >
          <CancelCircleIcon size={13} />
          Decline
        </Button>
      </div>
    </div>
  )
}
