import { useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"

// Shared invalidation for anything that writes to the `transactions` table —
// direct transaction mutations, CSV/PDF imports, and the invoice-paid DB
// trigger (sync_invoice_paid_transaction()) all land rows here. Every one of
// those call sites needs to bust the same three query families, so this hook
// is the single source of truth instead of each site hand-rolling the list
// (which is how ["metric", orgId] ended up invalidated in only two places in
// the whole app despite six dashboard RPCs reading from `transactions`).
//
// TanStack Query does prefix matching by default, so invalidating
// ["metric", orgId] busts every ["metric", orgId, rpcName, from, to] variant
// in one call — no need to enumerate RPC names or date ranges.
export function useInvalidateTransactionQueries() {
  const { orgId } = useAuth()
  const queryClient = useQueryClient()

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["transactions", orgId] })
    queryClient.invalidateQueries({ queryKey: ["transaction-summary", orgId] })
    queryClient.invalidateQueries({ queryKey: ["metric", orgId] })
  }, [queryClient, orgId])
}
