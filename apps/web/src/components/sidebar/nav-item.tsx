import { NavLink } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@travada-books/ui/components/tooltip"
import { cn } from "@travada-books/ui/lib/utils"

type NavItemProps = {
  icon: IconSvgElement
  label: string
  to: string
  comingSoon?: boolean
  collapsed?: boolean
}

export function NavItem({ icon, label, to, comingSoon, collapsed }: NavItemProps) {
  const iconEl = (
    <HugeiconsIcon icon={icon} size={16} color="currentColor" strokeWidth={1.5} className="shrink-0" />
  )

  if (comingSoon) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium cursor-not-allowed opacity-40",
              collapsed && "justify-center px-2"
            )}
          >
            {iconEl}
            {!collapsed && <span>{label}</span>}
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
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          {iconEl}
          {!collapsed && <span>{label}</span>}
        </span>
      )}
    </NavLink>
  )
}
