import { useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { useInvalidateTransactionQueries } from "@/hooks/use-invalidate-transaction-queries"

// Shared invalidation for any write to the invoice_payments ledger — creating
// or deleting a payment row. This replaces two call sites that used to do the
// same work for the old direct `status: "paid"` write:
//   - invoice-actions.tsx's `invalidateAfterMarkPaid()`
//   - detail.tsx's `variables.patch.status === "paid"` branch
// A ledger write moves exactly the same downstream data a status write used
// to (the invoice_payments_sync DB trigger still writes a row into
// `transactions`, still changes invoice totals visible in customer
// summaries), plus the two new payment-specific query keys.
export function useInvalidateAfterPaymentChange() {
  const { orgId } = useAuth()
  const queryClient = useQueryClient()
  const invalidateTransactionQueries = useInvalidateTransactionQueries()

  return useCallback(
    (invoiceId: string) => {
      invalidateTransactionQueries()
      queryClient.invalidateQueries({ queryKey: ["customer-invoices"] })
      queryClient.invalidateQueries({ queryKey: ["customer-invoice-summaries", orgId] })
      queryClient.invalidateQueries({ queryKey: ["customer-invoice-summary"] })
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] })
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId] })
      // Prefix match busts all three KPI buckets (open/overdue/paid). Without
      // this the invoices-page cards keep showing pre-payment figures.
      queryClient.invalidateQueries({ queryKey: ["invoice-summary", orgId] })
      queryClient.invalidateQueries({ queryKey: ["invoice-payments", invoiceId] })
    },
    [queryClient, orgId, invalidateTransactionQueries],
  )
}
