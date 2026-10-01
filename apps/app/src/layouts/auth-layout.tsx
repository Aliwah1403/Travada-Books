import { Outlet, Navigate, useLocation } from "react-router"
import { useTheme } from "@/components/theme-provider"
import { useAuth } from "@/contexts/auth-context"
import { SplitLayout } from "@/components/auth/split-layout"
import { AuthFigure } from "@/components/auth/auth-figure"
import LogoGreen from "@/assets/Logo-Green.svg"
import LogoLime from "@/assets/Logo-Lime.svg"

export function AuthLayout() {
  const { theme } = useTheme()
  const { user, loading, org, orgLoading } = useAuth()
  const { pathname } = useLocation()

  if (loading || orgLoading) return null
  if (user && !["/forgot-password/reset", "/forgot-password/verify", "/signup/verify"].includes(pathname)) {
    if (!org) {
      const pending = sessionStorage.getItem("pendingInviteToken")
      if (pending) return <Navigate to={`/accept-invite?token=${encodeURIComponent(pending)}`} replace />
    }
    return <Navigate to={org ? "/invoices" : "/onboarding/org"} replace />
  }
  const logo = theme === "dark" ? LogoLime : LogoGreen

  return (
    <SplitLayout
      figure={<AuthFigure />}
      form={
        <div className="flex w-full max-w-sm flex-col items-center">
          <div className="mb-8 flex flex-col items-center gap-2">
            <img src={logo} alt="Travada Books" className="size-9" />
            <span className="text-base font-semibold">Travada Books</span>
          </div>

          <div className="w-full">
            <Outlet />
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            Powered by{" "}
            <a
              href="https://travadabooks.com"
              className="underline underline-offset-4 fine-hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              Travada Systems
            </a>
          </p>
        </div>
      }
    />
  )
}
