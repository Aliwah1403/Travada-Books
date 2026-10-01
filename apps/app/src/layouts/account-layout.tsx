import { NavLink, Outlet } from "react-router"
import { Tooltip, TooltipContent, TooltipTrigger } from "@travada-books/ui/components/tooltip"
import { cn } from "@travada-books/ui/lib/utils"

type AccountNavItem = {
  label: string
  to: string
  comingSoon?: boolean
}

const accountNav: AccountNavItem[] = [
  { label: "Profile", to: "/account/profile" },
  { label: "Security", to: "/account/security" },
  { label: "Notifications", to: "/account/notifications" },
]

function AccountNavItem({ label, to, comingSoon }: AccountNavItem) {
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

export function AccountLayout() {
  return (
    <div className="flex flex-col">
      <div className="px-8 pt-8">
        <h1 className="text-2xl font-semibold">Account</h1>
      </div>

      <nav className="mt-6 flex items-center gap-6 border-b px-8">
        {accountNav.map((item) => (
          <AccountNavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="mx-auto w-full max-w-5xl px-8 py-8">
        <Outlet />
      </div>
    </div>
  )
}
