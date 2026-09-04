import { NavLink, Outlet, Navigate, useLocation } from "react-router"
import { Tooltip, TooltipContent, TooltipTrigger } from "@travada-books/ui/components/tooltip"
import { cn } from "@travada-books/ui/lib/utils"
import { useAuth } from "@/contexts/auth-context"

type SettingsNavItem = {
  label: string
  to: string
  comingSoon?: boolean
  ownerOnly?: boolean
}

const settingsNav: SettingsNavItem[] = [
  { label: "General", to: "/settings/general" },
  { label: "Team", to: "/settings/team" },
  { label: "Categories", to: "/settings/categories" },
  { label: "Inbox", to: "/settings/inbox" },
  { label: "Integrations", to: "/settings/integrations" },
  { label: "Billing", to: "/settings/billing", comingSoon: true, ownerOnly: true },
]

const ownerOnlyPaths = ["/settings/billing"]

function SettingsNavItem({ label, to, comingSoon }: SettingsNavItem) {
  if (comingSoon) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center px-0.5 py-3 text-sm font-medium cursor-not-allowed text-muted-foreground opacity-40">
            {label}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">Coming soon</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <span
          className={cn(
            "flex items-center border-b-2 px-0.5 py-3 text-sm transition-colors",
            isActive ?
              "border-foreground font-semibold text-foreground"
            : "border-transparent font-medium text-muted-foreground fine-hover:text-foreground",
          )}
        >
          {label}
        </span>
      )}
    </NavLink>
  )
}

export function SettingsLayout() {
  const { orgRole } = useAuth()
  const { pathname } = useLocation()
  const isOwner = orgRole === "owner"

  if (!isOwner && ownerOnlyPaths.some((p) => pathname.startsWith(p))) {
    return <Navigate to="/settings/general" replace />
  }

  const visibleNav = settingsNav.filter((item) => isOwner || !item.ownerOnly)

  return (
    <div className="flex flex-col">
      <div className="px-8 pt-8">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      <nav className="mt-6 flex items-center gap-6 border-b px-8">
        {visibleNav.map((item) => (
          <SettingsNavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="mx-auto w-full max-w-5xl px-8 py-8">
        <Outlet />
      </div>
    </div>
  )
}
