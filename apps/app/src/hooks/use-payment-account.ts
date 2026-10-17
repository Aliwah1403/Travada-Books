import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { PAYSTACK_MOCK } from "@/lib/features"
import { getPaymentAccount, subscribeToMockPaymentAccount } from "@/lib/queries/payment-accounts"

// The org's payment account (null = not connected). In mock mode it also
// refetches when window.__paystackMock changes the in-memory account.
export function usePaymentAccount() {
  const { orgId } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!PAYSTACK_MOCK) return
    return subscribeToMockPaymentAccount(() => {
      queryClient.invalidateQueries({ queryKey: ["payment-account", orgId] })
    })
  }, [orgId, queryClient])

  return useQuery({
    queryKey: ["payment-account", orgId],
    queryFn: () => getPaymentAccount(orgId!),
    enabled: !!orgId,
  })
}
