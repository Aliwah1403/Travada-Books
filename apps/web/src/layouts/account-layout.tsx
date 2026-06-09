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
          <div className="flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-not-allowed opacity-40">
            {label}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">Coming soon</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <span
          className={cn(
            "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-muted text-foreground"
              : "text-muted-foreground fine-hover:bg-muted fine-hover:text-foreground",
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
    <div className="flex">
      <nav className="w-52 shrink-0 border-r px-3 py-6 flex flex-col gap-0.5">
        {accountNav.map((item) => (
          <AccountNavItem key={item.to} {...item} />
        ))}
      </nav>
      <div className="flex-1 px-8 py-6 max-w-2xl">
        <Outlet />
      </div>
    </div>
  )
}
