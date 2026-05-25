import { Outlet, Navigate, useLocation } from "react-router"
import { useTheme } from "@/components/theme-provider"
import { useAuth } from "@/contexts/auth-context"
import LogoGreen from "@/assets/Logo-Green.svg"
import LogoLime from "@/assets/Logo-Lime.svg"

const STEPS = [
  { path: "/onboarding/org", label: "Your business" },
  { path: "/onboarding/invite", label: "Invite team" },
]

export function OnboardingLayout() {
  const { theme } = useTheme()
  const { user, loading, orgId, orgLoading } = useAuth()
  const { pathname } = useLocation()

  if (loading || orgLoading) return null
  if (!user) return <Navigate to="/login" replace />
  if (orgId) return <Navigate to="/invoices" replace />

  const logo = theme === "dark" ? LogoLime : LogoGreen
  const currentStep = STEPS.findIndex((s) => s.path === pathname)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <img src={logo} alt="Travada Books" className="size-9" />
        <span className="text-base font-semibold">Travada Books</span>
      </div>

      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((step, i) => {
          const isDone = i < currentStep
          const isActive = i === currentStep
          return (
            <div key={step.path} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={[
                    "flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "border-2 border-primary text-primary"
                        : "border-2 border-muted-foreground/30 text-muted-foreground/50",
                  ].join(" ")}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <span
                  className={[
                    "text-xs",
                    isActive ? "font-medium text-foreground" : "text-muted-foreground/60",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={[
                    "mb-4 h-px w-12 transition-colors",
                    isDone ? "bg-primary" : "bg-muted-foreground/20",
                  ].join(" ")}
                />
              )}
            </div>
          )
        })}
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
