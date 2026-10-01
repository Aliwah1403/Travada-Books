import { Outlet, Navigate, useSearchParams } from "react-router"
import { useAuth } from "@/contexts/auth-context"

export function OnboardingLayout() {
  const { user, loading, orgId, orgLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const isCreateMode = searchParams.get("mode") === "create"

  if (loading || orgLoading) return null
  if (!user) return <Navigate to="/login" replace />
  // Allow authenticated users with an org through when creating an additional org
  if (orgId && !isCreateMode) return <Navigate to="/invoices" replace />

  const pending = sessionStorage.getItem("pendingInviteToken")
  if (pending && !isCreateMode) return <Navigate to={`/accept-invite?token=${pending}`} replace />

  return <Outlet />
}
