import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { trackEvent, LogEvents } from "@/lib/analytics"
import {
  daysFromToday,
  deleteBill,
  isBillOverdue,
  setBillPaid,
  type Bill,
} from "@/lib/queries/bills"
import { getInboxSignedUrl } from "@/lib/queries/inbox"

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong. Please try again."
}

/** Mutations shared by the row menu and the detail sheet. */
export function useBillActions() {
  const { orgId } = useAuth()
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["bills", orgId] })
    queryClient.invalidateQueries({ queryKey: ["bill-for-inbox"] })
  }

  const paid = useMutation({
    mutationFn: ({ bill, paid }: { bill: Bill; paid: boolean }) => setBillPaid(bill.id, paid),
    onSuccess: invalidate,
  })
  const remove = useMutation({ mutationFn: (bill: Bill) => deleteBill(bill.id), onSuccess: invalidate })

  function markPaid(bill: Bill, isPaid: boolean) {
    // Matched bills are driven by the linked transaction; the UI hides this, guard anyway.
    if (!isPaid && bill.transaction_id) return
    if (isPaid) {
      trackEvent(LogEvents.BillMarkedPaid, {
        was_overdue: isBillOverdue(bill),
        days_from_due: bill.due_date ? daysFromToday(bill.due_date) : null,
        source: bill.source,
      })
    } else {
      trackEvent(LogEvents.BillMarkedUnpaid, { source: bill.source })
    }
    toast.promise(paid.mutateAsync({ bill, paid: isPaid }), {
      loading: isPaid ? "Marking as paid…" : "Marking as unpaid…",
      success: isPaid ? "Marked as paid" : "Marked as unpaid",
      error: errMsg,
    })
  }

  function removeBill(bill: Bill) {
    trackEvent(LogEvents.BillDeleted, { source: bill.source, status: bill.status })
    toast.promise(remove.mutateAsync(bill), {
      loading: "Deleting…",
      success: "Bill deleted",
      error: errMsg,
    })
  }

  function viewDocument(bill: Bill) {
    if (!bill.inbox_item) return
    trackEvent(LogEvents.BillFileOpened, { source: bill.source })
    // Open the tab synchronously so the popup isn't blocked after the await.
    const tab = window.open("", "_blank")
    toast.promise(
      getInboxSignedUrl(bill.inbox_item.file_path).then((url) => {
        if (tab) tab.location.href = url
        else window.open(url, "_blank")
      }),
      {
        loading: "Opening document…",
        success: "Document opened",
        error: (e) => {
          tab?.close()
          return errMsg(e)
        },
      },
    )
  }

  return { markPaid, removeBill, viewDocument }
}
