import { Outlet, Navigate, useLocation } from "react-router"
import { useTheme } from "@/components/theme-provider"
import { useAuth } from "@/contexts/auth-context"
import LogoGreen from "@/assets/Logo-Green.svg"
import LogoLime from "@/assets/Logo-Lime.svg"

export function AuthLayout() {
  const { theme } = useTheme()
  const { user, loading } = useAuth()
  const { pathname } = useLocation()

  if (loading) return null
  // Allow reset-password page even when session exists — verifyOtp creates a session
  // and the user still needs to set their new password before being fully in
  if (user && pathname !== "/forgot-password/reset") return <Navigate to="/invoices" replace />
  const logo = theme === "dark" ? LogoLime : LogoGreen

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <img src={logo} alt="Travada Books" className="size-9" />
        <span className="text-base font-semibold">Travada Books</span>
      </div>

      <div className="w-full max-w-md">
        <Outlet />
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Powered by{" "}
        <a
          href="https://travadasys.com"
          className="underline underline-offset-4 hover:text-foreground"
          target="_blank"
          rel="noreferrer"
        >
          Travada Systems
        </a>
      </p>
    </div>
  )
}
